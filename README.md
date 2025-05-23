# GML-Custom-News

## Описание
Интеграция для передачи сообщений из Discord или Telegram в Gml Launcher через API.

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
   - Настройте параметры в зависимости от выбранного источника данных:
   
   **Для Discord:**
     - `DISCORD_BOT_TOKEN`: Токен Discord-бота с правами на чтение канала
     - `CHANNEL_ID`: ID Discord-канала для мониторинга
     - `PORT`: Порт для запуска приложения (по умолчанию 3000)
     
   **Для Telegram:**
     - `TELEGRAM_CHANNEL`: Имя канала Telegram (без символа @)
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
   - **Для Discord:** добавьте endpoint в формате `https://ваш-домен.ru/discord/messages`
   - **Для Telegram:** добавьте endpoint в формате `https://ваш-домен.ru/telegram/messages`

### Обновление интеграции

Используйте скрипт `update.sh`:

#### Первое использование
```bash
chmod +x update.sh
./update.sh
```

#### Основные команды

**Стандартное обновление:**
```bash
./update.sh
```

**Откат к предыдущей версии:**
```bash
./update.sh rollback
```

**Текущие логи обновления:**
```bash
tail -f update.log
```

**Ручное восстановление при необходимости:**
```bash
# Просмотр резервных копий
ls -la .backup/git_backup_*/

# Применение изменений вручную
git apply .backup/git_backup_YYYYMMDD_HHMMSS/working_changes.patch

# Восстановление конкретного файла
cp .backup/git_backup_YYYYMMDD_HHMMSS/update.sh ./update.sh
```

## Примечания
- Рекомендуется использовать либо Discord, либо Telegram в качестве источника данных (не оба одновременно)
- Сообщения кэшируются для обеспечения бесперебойной работы при недоступности источника данных
- Для Telegram сообщения из кэша используются, если они были сохранены менее 5 минут назад
- Скрипт обновления автоматически создает резервные копии

## Полезные ссылки
- [Discord Developer Documentation](https://discord.com/developers/docs/intro)
- [Как найти ID Discord канала](https://support.discord.com/hc/ru/articles/206346498-Где-мне-найти-ID-пользователя-сервера-сообщения)
- [Как сделать публичный юзернейм Telegram каналу](https://www.youtube.com/watch?v=RnxgtGFTUdc)

## Лицензия
Данный проект распространяется под модифицированной лицензией MIT с дополнительными ограничениями:
- Разрешается свободное использование, включая коммерческое, при интеграции в сервисы
- Запрещена продажа данного ПО как самостоятельного продукта
