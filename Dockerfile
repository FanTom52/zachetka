FROM node:18-alpine

# Устанавливаем зависимости для SQLite
RUN apk add --no-cache python3 make g++ sqlite

# Создаем директорию приложения
WORKDIR /app

# Копируем package.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем необходимые директории
RUN mkdir -p database backups logs

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]