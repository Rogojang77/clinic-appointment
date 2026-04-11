import crypto from "crypto";

type MetaEnv = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  templateName?: string;
  templateLanguage: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getMetaEnv(): MetaEnv {
  return {
    accessToken: requireEnv("META_WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: requireEnv("META_WHATSAPP_PHONE_NUMBER_ID"),
    apiVersion: process.env.META_WHATSAPP_API_VERSION?.trim() || "v21.0",
    templateName: process.env.META_WHATSAPP_TEMPLATE_NAME?.trim() || undefined,
    templateLanguage: process.env.META_WHATSAPP_TEMPLATE_LANG?.trim() || "ro",
  };
}

export function normalizePhoneNumberToE164RO(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1).replace(/\D/g, "");
    if (digits.length < 8) return null;
    return `+${digits}`;
  }

  if (cleaned.startsWith("00")) {
    const digits = cleaned.slice(2).replace(/\D/g, "");
    if (digits.length < 8) return null;
    return `+${digits}`;
  }

  const digitsOnly = cleaned.replace(/\D/g, "");
  if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    return `+40${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.startsWith("40") && digitsOnly.length >= 9) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.length >= 8) return `+${digitsOnly}`;
  return null;
}

function toMetaWaId(e164: string): string {
  return e164.replace(/^\+/, "");
}

function getTemplateLanguageCandidates(language: string): string[] {
  const candidates: string[] = [];
  const pushUnique = (value: string) => {
    const v = value.trim();
    if (v && !candidates.includes(v)) candidates.push(v);
  };

  pushUnique(language);
  const normalized = language.trim().toLowerCase();

  // Meta templates often use locale form (e.g. ro_RO, en_US).
  if (/^[a-z]{2}$/.test(normalized)) {
    const localeMap: Record<string, string> = {
      ro: "ro",
      en: "en_US",
    };
    pushUnique(localeMap[normalized] ?? `${normalized}_${normalized.toUpperCase()}`);
  } else if (/^[a-z]{2}_[A-Z]{2}$/.test(language)) {
    pushUnique(language.split("_")[0].toLowerCase());
  }

  return candidates;
}

type MetaSendError = {
  message?: string;
  code?: number;
  error_subcode?: number;
  error_data?: { details?: string };
};

async function sendMetaRequest(endpoint: string, accessToken: string, payload: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: MetaSendError;
  };
  return { response, data };
}

export function hashTokenSha256Hex(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function buildReminderText(params: {
  section: string;
  doctor: string;
  appointmentDateText: string;
  appointmentTimeText: string;
  customerName?: string;
}): string {
  const name = params.customerName?.trim() || "Pacient";
  return (
    `Bună ziua, ${name}! ` +
    `Vă rugăm să confirmați că vă puteți prezenta la Policlinica Moș pentru ${params.section}, ` +
    `la doctorul ${params.doctor}, în data de ${params.appointmentDateText}, la ora ${params.appointmentTimeText}. ` +
    "Vă mulțumim."
  );
}

/** Pentru secția Ecografie, mesajul WhatsApp folosește mereu acest medic. */
const ECOGRAFIE_WHATSAPP_DOCTOR_NAME = "Călin Moș";

export function resolveWhatsAppDoctorForSection(section: string, doctor: string): string {
  if (section.trim().toLowerCase() === "ecografie") {
    return ECOGRAFIE_WHATSAPP_DOCTOR_NAME;
  }
  return doctor;
}

export async function sendWhatsAppReminder(params: {
  toPhoneNumberRaw: string;
  customerName?: string;
  section: string;
  doctor: string;
  appointmentDateText: string;
  appointmentTimeText: string;
}): Promise<{ sid: string; to: string }> {
  const env = getMetaEnv();
  const doctorForMessage = resolveWhatsAppDoctorForSection(params.section, params.doctor);
  const e164 = normalizePhoneNumberToE164RO(params.toPhoneNumberRaw);
  if (!e164) {
    throw new Error(`Invalid phone number: ${params.toPhoneNumberRaw}`);
  }

  const to = toMetaWaId(e164);
  const endpoint = `https://graph.facebook.com/${env.apiVersion}/${env.phoneNumberId}/messages`;

  let payload: Record<string, unknown>;
  let responseData: { messages?: Array<{ id?: string }>; error?: MetaSendError } = {};
  let responseStatus = 0;

  if (env.templateName) {
    const languageCandidates = getTemplateLanguageCandidates(env.templateLanguage);
    let lastError: MetaSendError | undefined;

    for (const languageCode of languageCandidates) {
      payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: env.templateName,
          language: { code: languageCode },
          components: [
            {
              type: "body",
              parameters: [
              {
                type: "text",
                parameter_name: "customer_name",
                text: params.customerName?.trim() || "Pacient",
              },
              {
                type: "text",
                parameter_name: "section",
                text: params.section,
              },
              {
                type: "text",
                parameter_name: "doctor",
                text: doctorForMessage,
              },
              {
                type: "text",
                parameter_name: "date",
                text: params.appointmentDateText,
              },
              {
                type: "text",
                parameter_name: "hour",
                text: params.appointmentTimeText,
              },
              ],
            },
          ],
        },
      };

      const { response, data } = await sendMetaRequest(endpoint, env.accessToken, payload);
      responseStatus = response.status;
      responseData = data;

      if (response.ok) {
        const sid = data?.messages?.[0]?.id;
        if (!sid) throw new Error("Meta WhatsApp send failed: missing message id");
        return { sid, to };
      }

      lastError = data?.error;
      const message = String(lastError?.message || "");
      const canRetryWithNextLanguage =
        (lastError?.code === 100 || /invalid parameter/i.test(message)) &&
        languageCode !== languageCandidates[languageCandidates.length - 1];

      if (!canRetryWithNextLanguage) {
        break;
      }
    }

    const details =
      responseData?.error?.error_data?.details ||
      responseData?.error?.message ||
      `HTTP ${responseStatus}`;
    const code = responseData?.error?.code;
    const subcode = responseData?.error?.error_subcode;
    throw new Error(
      `Meta WhatsApp send failed: ${details}` +
        (code ? ` (code=${code}` : "") +
        (subcode ? ` subcode=${subcode}` : "") +
        (code ? ")" : "")
    );
  } else {
    payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body: buildReminderText({ ...params, doctor: doctorForMessage }),
      },
    };
    const { response, data } = await sendMetaRequest(endpoint, env.accessToken, payload);
    responseStatus = response.status;
    responseData = data;
    if (!response.ok) {
      const details =
        data?.error?.error_data?.details ||
        data?.error?.message ||
        `HTTP ${responseStatus}`;
      const code = data?.error?.code;
      const subcode = data?.error?.error_subcode;
      throw new Error(
        `Meta WhatsApp send failed: ${details}` +
          (code ? ` (code=${code}` : "") +
          (subcode ? ` subcode=${subcode}` : "") +
          (code ? ")" : "")
      );
    }
  }

  const sid = responseData?.messages?.[0]?.id;
  if (!sid) {
    throw new Error("Meta WhatsApp send failed: missing message id");
  }
  return { sid, to };
}
