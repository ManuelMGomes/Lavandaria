FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev libsqlite3-dev

RUN docker-php-ext-install pdo_mysql pdo_sqlite mbstring exif pcntl bcmath gd
RUN pecl install redis && docker-php-ext-enable redis

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY ./php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www
