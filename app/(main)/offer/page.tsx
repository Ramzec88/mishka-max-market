import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Оферта — Маркет Мишки Макса',
};

export default function OfferPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>Публичная оферта</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 32 }}>
        Редакция от 19 апреля 2026 года
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>1. Общие положения</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Настоящая публичная оферта является официальным предложением ИП Васюков Алексей Игоревич,
          ИНН 320203526914, ОГРНИП 321325600053361 (далее — «Продавец») заключить договор купли-продажи
          цифровых товаров (файлов) на условиях, изложенных ниже.
        </p>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7, marginTop: 12 }}>
          Акцептом настоящей оферты является оплата заказа покупателем. С момента оплаты договор
          считается заключённым.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>2. Предмет договора</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Продавец обязуется передать Покупателю цифровые товары (аудиозаписи в формате MP3,
          документы в формате PDF, иные файлы) в виде ссылок для скачивания, направляемых на
          электронную почту Покупателя. Покупатель обязуется оплатить выбранные товары.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>3. Порядок оплаты</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Оплата производится через платёжный сервис ЮKassa. Принимаются банковские карты Visa,
          MasterCard, МИР. Все транзакции защищены SSL-шифрованием. Чек об оплате направляется
          Покупателю на электронную почту в соответствии с требованиями Федерального закона
          №54-ФЗ.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>4. Доставка товара</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          После успешной оплаты Покупатель получает письмо на указанный email с ссылками для
          скачивания. Ссылки действуют 7 (семь) календарных дней с момента оплаты. Каждая ссылка
          может быть использована не более 5 (пяти) раз. По истечении срока или лимита скачиваний
          Покупатель может обратиться в поддержку для продления.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>5. Возврат</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          В соответствии со статьёй 26.1 Закона РФ «О защите прав потребителей» цифровые товары
          надлежащего качества возврату и обмену не подлежат. В случае неполучения файлов
          (технические проблемы на стороне сервиса) Покупатель вправе потребовать повторной
          отправки ссылок или полного возврата средств.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>6. Авторские права</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Все материалы являются объектами авторского права. Покупатель вправе использовать
          приобретённые материалы в личных и профессиональных целях (проведение занятий,
          утренников, мероприятий). Перепродажа, тиражирование и публичная передача третьим лицам
          без письменного разрешения Продавца запрещены.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>7. Контакты</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          По всем вопросам обращайтесь:{' '}
          <a href="mailto:info@mishka-max.ru" style={{ color: 'var(--orange)' }}>
            info@mishka-max.ru
          </a>
        </p>
      </section>
    </div>
  );
}
