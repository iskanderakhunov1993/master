# Design QA: live tracking и паспорт дома

Результат проверки: passed.

## Scope

- Client live tracking, полноэкранная карта и «Мой дом».
- Mobile acceptance viewport: 390 × 844 px.
- Визуальное направление: map-first hierarchy, ETA, карточка выбранного мастера, контакты, цена и следующий этап.

## Evidence

- [Активный заказ](./active-tracking-mobile.png)
- [Полноэкранная карта](./live-map-overlay-mobile.png)
- [Паспорт дома](./home-passport-mobile.png)
- [Сравнение с выбранным направлением](./tracking-comparison.png)

## Проверки

- Tracking UI показывается только для `MASTER_ON_THE_WAY`.
- «Следить на карте» открывает `#live-tracking-map`, закрытие возвращает к заказу.
- `/client/home` доступен из mobile navigation.
- Browser console не содержала ошибок.
- `npm run lint`, `npm run build` и `git diff --check` прошли.

## Ограничение

Карта использует статический demo asset `/maps/master-en-route.png`. Это визуальный прототип, а не live GPS. Требования к настоящей геолокации описаны в [P0-спецификации](../07-p0-specifications.md).
