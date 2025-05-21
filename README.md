# GML-Custom-News

## Описание
Интеграция для передачи сообщений из Discord (хочется еще что-то? предлагай) в Gml Launcher через API.

## Установка и настройка

### Предварительные требования
- VPS сервер
- Docker и Docker Compose
- NGINX (для проксирования и SSL)
- Git

### Шаги установки

1. Клонировать репозиторий:
   ```bash
   git clone https://github.com/Niobrix/gml-custom-news.git
   cd gml-custom-news
   ```

2. Настройка переменных окружения:
   - Создайте файл `.env` на основе `.env.example`
   - Настройте следующие параметры:
     - `DISCORD_BOT_TOKEN`: Токен Discord-бота с правами на чтение канала
     - `CHANNEL_ID`: ID Discord-канала для мониторинга
     - `PORT`: Порт для запуска приложения (по умолчанию 3000)

3. Запуск приложения:
   ```bash
   docker compose up -d --build
   ```

4. Настройка NGINX и SSL:
   - Настройте проксирование через NGINX 
   - Пример конфигурации: [https://gist.github.com/yakoshiq/5b6aa80133fef30f8dc44f7e3cb37ec6](https://gist.github.com/yakoshiq/5b6aa80133fef30f8dc44f7e3cb37ec6)
   - Получите SSL-сертификат:
     ```bash
     certbot --nginx
     ```

5. Настройка интеграции в GML-панели:
   - Добавьте endpoint в формате `https://ваш-домен.ru/discord/messages`

## Полезные ссылки
- [Discord Developer Documentation](https://discord.com/developers/docs/intro)
- [Как найти ID Discord канала](https://support.discord.com/hc/ru/articles/206346498-Где-мне-найти-ID-пользователя-сервера-сообщения)

## Лицензия
Данный проект распространяется под модифицированной лицензией MIT с дополнительными ограничениями:
- Разрешается свободное использование, включая коммерческое, при интеграции в сервисы
- Запрещена продажа данного ПО как самостоятельного продукта
