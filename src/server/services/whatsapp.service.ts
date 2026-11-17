import { serverConfig } from '../config/env.ts';
import { formatTanggalIndonesiaWib } from '../utils/sanitize.ts';

export interface TemplateContext {
  nama: string;
  profesi: string;
  unit: string;
  noSip: string;
  tglKadaluarsa: string; // YYYY-MM-DD
  sisaHari: number;
}

export function renderWaTemplateBody(
  templateBody: string,
  ctx: TemplateContext
): string {
  const formattedDate = formatTanggalIndonesiaWib(ctx.tglKadaluarsa);
  return templateBody
    .replace(/\{nama\}/g, ctx.nama)
    .replace(/\{profesi\}/g, ctx.profesi)
    .replace(/\{unit\}/g, ctx.unit)
    .replace(/\{no_sip\}/g, ctx.noSip)
    .replace(/\{tgl_kadaluarsa\}/g, formattedDate)
    .replace(/\{tanggal_berakhir\}/g, formattedDate)
    .replace(/\{sisa_hari\}/g, String(ctx.sisaHari));
}

export interface WaDispatchResult {
  success: boolean;
  deliveryStatus: 'Terkirim' | 'Gagal';
  gatewayResponse: string;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchWhatsappMessage(
  phoneTarget: string,
  message: string
): Promise<WaDispatchResult> {
  const { provider, url, token, phoneNumberId } = serverConfig.waGateway;

  if (provider === 'SIMULATION' || !token) {
    return {
      success: true,
      deliveryStatus: 'Terkirim',
      gatewayResponse: `SIMULATION_OK (${provider}) -> +${phoneTarget}`,
    };
  }

  try {
    let endpoint = url;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let payload: Record<string, unknown> = {};

    if (provider === 'FONNTE') {
      endpoint = url || 'https://api.fonnte.com/send';
      headers = {
        ...headers,
        Authorization: token,
      };
      payload = {
        target: phoneTarget,
        message,
        countryCode: '62',
      };
    } else if (provider === 'WABLAS') {
      endpoint = url || 'https://solo.wablas.com/api/send-message';
      headers = {
        ...headers,
        Authorization: token,
      };
      payload = {
        phone: phoneTarget,
        message,
      };
    } else if (provider === 'META_CLOUD') {
      endpoint =
        url ||
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`,
      };
      payload = {
        messaging_product: 'whatsapp',
        to: phoneTarget,
        type: 'text',
        text: { body: message },
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const textBody = await response.text();
    if (!response.ok) {
      return {
        success: false,
        deliveryStatus: 'Gagal',
        gatewayResponse: `HTTP ${response.status}: ${textBody.slice(0, 300)}`,
      };
    }

    return {
      success: true,
      deliveryStatus: 'Terkirim',
      gatewayResponse: textBody.slice(0, 300) || 'HTTP 200 OK',
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Network error';
    return {
      success: false,
      deliveryStatus: 'Gagal',
      gatewayResponse: errMsg.slice(0, 300),
    };
  }
}
