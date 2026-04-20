'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YooMoneyCheckoutWidget: new (options: {
      confirmation_token: string;
      return_url: string;
      error_callback?: (err: unknown) => void;
    }) => {
      render: (containerId: string) => void;
      destroy: () => void;
    };
  }
}

interface YooKassaWidgetProps {
  confirmationToken: string;
  orderId: string;
}

export default function YooKassaWidget({ confirmationToken, orderId }: YooKassaWidgetProps) {
  type WidgetInstance = { render: (containerId: string) => void; destroy: () => void };
  const widgetRef = useRef<WidgetInstance | null>(null);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  useEffect(() => {
    if (!window.YooMoneyCheckoutWidget) return;

    widgetRef.current = new window.YooMoneyCheckoutWidget({
      confirmation_token: confirmationToken,
      return_url: `${siteUrl}/thank-you?order=${orderId}`,
      error_callback: (err) => console.error('YooKassa widget error:', err),
    });
    widgetRef.current.render('yookassa-widget-container');

    return () => {
      widgetRef.current?.destroy();
    };
  }, [confirmationToken, orderId, siteUrl]);

  return (
    <>
      <script src="https://yookassa.ru/checkout-widget/v1/checkout-widget.js" async />
      <div id="yookassa-widget-container" style={{ marginTop: 16 }} />
    </>
  );
}
