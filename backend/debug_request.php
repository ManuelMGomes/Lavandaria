<?php

declare(strict_types=1);

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Kernel::class);

$path = $argv[1] ?? '/api/bootstrap';
$method = $argv[2] ?? 'GET';

try {
    $request = Request::create($path, $method);
    $response = $kernel->handle($request);

    fwrite(STDOUT, "STATUS=".$response->getStatusCode().PHP_EOL);
    fwrite(STDOUT, $response->getContent().PHP_EOL);

    $kernel->terminate($request, $response);
} catch (Throwable $e) {
    fwrite(STDOUT, get_class($e).PHP_EOL);
    fwrite(STDOUT, $e->getMessage().PHP_EOL);
    fwrite(STDOUT, $e->getFile().':'.$e->getLine().PHP_EOL);
    fwrite(STDOUT, $e->getTraceAsString().PHP_EOL);

    exit(1);
}
