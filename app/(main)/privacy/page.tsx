import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — Маркет Мишки Макса',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
        Политика конфиденциальности
      </h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 32 }}>
        Редакция от 19 апреля 2026 года
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>1. Оператор данных</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Оператором персональных данных является ИП Васюков Алексей Игоревич, ИНН 320203526914.
          Контактный email:{' '}
          <a href="mailto:info@mishka-max.ru" style={{ color: 'var(--orange)' }}>
            info@mishka-max.ru
          </a>
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>2. Какие данные собираем</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          При оформлении заказа мы собираем только адрес электронной почты (email). Платёжные
          данные (номер карты и т.д.) обрабатываются исключительно платёжным сервисом ЮKassa и
          не передаются нам.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>3. Цели обработки</h2>
        <ul style={{ color: 'var(--ink-soft)', lineHeight: 1.7, paddingLeft: 20 }}>
          <li>Отправка ссылок для скачивания приобретённых материалов</li>
          <li>Предоставление доступа к странице заказа</li>
          <li>Ответы на обращения в поддержку</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>4. Хранение данных</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Данные хранятся в защищённой базе данных Supabase (EU-регион) в течение 3 лет с момента
          последней операции, либо до отзыва согласия субъектом персональных данных.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>5. Передача третьим лицам</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Email передаётся платёжному сервису ЮKassa для формирования фискального чека в
          соответствии с ФЗ-54. Третьим лицам в маркетинговых целях данные не передаются.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>6. Ваши права</h2>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          Вы вправе запросить удаление своих персональных данных, направив письмо на{' '}
          <a href="mailto:info@mishka-max.ru" style={{ color: 'var(--orange)' }}>
            info@mishka-max.ru
          </a>
          . Запрос будет выполнен в течение 30 дней.
        </p>
      </section>
    </div>
  );
}
