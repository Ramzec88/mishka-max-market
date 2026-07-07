import { createHash } from 'crypto';

const PAYMENT_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

// We don't pre-register a numeric InvId with Robokassa — InvId is always 0 and the
// order is correlated purely via the Shp_orderid custom parameter, which Robokassa
// echoes back unchanged on ResultURL, SuccessURL and FailURL.
const INV_ID = 0;
const ORDER_SHP_KEY = 'Shp_orderid';

function formatSum(kopecks: number): string {
  return (kopecks / 100).toFixed(2);
}

function buildShpSignaturePart(shpParams: Record<string, string>): string {
  const sortedKeys = Object.keys(shpParams).sort((a, b) => a.localeCompare(b));
  return sortedKeys.map((k) => `${k}=${shpParams[k]}`).join(':');
}

export interface RobokassaPaymentParams {
  amountKopecks: number;
  description: string;
  email?: string;
  orderId: string;
}

export function buildRobokassaPaymentUrl(params: RobokassaPaymentParams): string {
  const merchantLogin = process.env.ROBOKASSA_MERCHANT_LOGIN;
  const password1 = process.env.ROBOKASSA_PASSWORD1;
  if (!merchantLogin) throw new Error('ROBOKASSA_MERCHANT_LOGIN не настроен');
  if (!password1) throw new Error('ROBOKASSA_PASSWORD1 не настроен');

  const outSum = formatSum(params.amountKopecks);
  const shpParams = { [ORDER_SHP_KEY]: params.orderId };
  const shpPart = buildShpSignaturePart(shpParams);

  const signatureBase = `${merchantLogin}:${outSum}:${INV_ID}:${password1}:${shpPart}`;
  const signatureValue = createHash('md5').update(signatureBase).digest('hex');

  const query = new URLSearchParams({
    MerchantLogin: merchantLogin,
    OutSum: outSum,
    InvId: String(INV_ID),
    Description: params.description.slice(0, 100),
    SignatureValue: signatureValue,
    Culture: 'ru',
    Encoding: 'utf-8',
    [ORDER_SHP_KEY]: params.orderId,
  });
  if (params.email) query.set('Email', params.email);
  if (process.env.ROBOKASSA_TEST_MODE === '1') query.set('IsTest', '1');

  return `${PAYMENT_URL}?${query.toString()}`;
}

// Verifies the ResultURL notification signature: MD5(OutSum:InvId:Password2[:Shp_key=value...]).
export function verifyRobokassaResultSignature(payload: Record<string, string>): boolean {
  const password2 = process.env.ROBOKASSA_PASSWORD2;
  if (!password2) return false;
  if (!payload.OutSum || !payload.InvId || !payload.SignatureValue) return false;

  const shpParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key.startsWith('Shp_')) shpParams[key] = value;
  }
  const shpPart = buildShpSignaturePart(shpParams);

  const base = `${payload.OutSum}:${payload.InvId}:${password2}${shpPart ? `:${shpPart}` : ''}`;
  const expected = createHash('md5').update(base).digest('hex');
  return expected.toLowerCase() === payload.SignatureValue.toLowerCase();
}

export function getOrderIdFromRobokassaPayload(payload: Record<string, string>): string | null {
  return payload[ORDER_SHP_KEY] ?? null;
}
