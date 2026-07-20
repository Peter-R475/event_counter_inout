<?php
session_start();
include 'connect.php';

header('Content-Type: application/json');

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!isset($data['current_participants']) || !isset($data['total_participants']) || !isset($data['Tme'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid data payload']);
    exit;
}

$total_participants = $data['total_participants'];
$current_participants = $data['current_participants'];
$hourr = $data['Tme'];

$stmt = $db_pdo->prepare("INSERT INTO `event_records`(`Time`, `total_participants`, `current_participants`, `event_name`) VALUES (:hourr, :count, :current, :event_name)");
$stmt->bindParam(':count', $total_participants, PDO::PARAM_INT);
$stmt->bindParam(':current', $current_participants, PDO::PARAM_INT);
$stmt->bindParam(':hourr', $hourr, PDO::PARAM_STR);
$stmt->bindParam(':event_name', $_SESSION['event_name'], PDO::PARAM_STR);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'People count updated successfully']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Failed to update people count']);
}
?>