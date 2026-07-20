<?php
$dbhost = "localhost";
$dbuser = "root";
$password = "";
$dbname = "people_event";

try {
    $dsn = "mysql:host=$dbhost;dbname=$dbname;charset=utf8mb4";
    $db_pdo = new PDO($dsn, $dbuser, $password);
    $db_pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log($e->getMessage());
    die("database connection failed.");
}

try {
    $dsn = "mysql:host=$dbhost;dbname=$dbname;charset=utf8mb4";
    $db_staff_pdo = new PDO($dsn, $dbuser, $password);
    $db_staff_pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log($e->getMessage());
    echo $e->getMessage();
    die("staff database connection failed.");
}

?>