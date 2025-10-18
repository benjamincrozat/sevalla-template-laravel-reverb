#!/usr/bin/env sh
set -e

php artisan optimize

supervisord -c /etc/supervisord.conf
