<?php

include 'connect.php';

// Determine the interval selected by the user
$interval = isset($_GET['interval']) ? $_GET['interval'] : 'hour';

// Change SQL aggregation group based on selection
if ($interval === 'minute') {
    // Groups and orders data by raw date string logic format (Y-m-d H:i:00)
    $query = "SELECT DATE_FORMAT(STR_TO_DATE(`Time`, '%d:%m:%Y:%H:%i:%s'), '%Y-%m-%d %H:%i:00') AS `RawTime`, 
                 DATE_FORMAT(STR_TO_DATE(`Time`, '%d:%m:%Y:%H:%i:%s'), '%Y-%m-%d %H:%i:00') AS `TimeGroup`, 
                 AVG(`current_participants`) AS `current_participants`,
                 MAX(`total_participants`) AS `total_participants` 
          FROM event_records 
          WHERE `event_name` = :event_name
          GROUP BY DATE_FORMAT(STR_TO_DATE(`Time`, '%d:%m:%Y:%H:%i:%s'), '%Y-%m-%d %H:%i:00')
          ORDER BY `RawTime` ASC";
} else {
    // Default: Groups and orders data by raw date string logic format (Y-m-d H:00:00)
    $query = "SELECT DATE_FORMAT(STR_TO_DATE(`Time`, '%e:%c:%Y:%H:%i:%s'), '%Y-%m-%d %H:00:00') AS `RawTime`, 
                     DATE_FORMAT(STR_TO_DATE(`Time`, '%e:%c:%Y:%H:%i:%s'), '%Y-%m-%d %H:00:00') AS `TimeGroup`, 
                     AVG(`current_participants`) AS `current_participants`,
                     MAX(`total_participants`) AS `total_participants` 
              FROM event_records
              WHERE `event_name` = :event_name
              GROUP BY `RawTime` 
              ORDER BY `RawTime` ASC";
}



$stmt = $db_pdo->prepare($query);
$stmt->bindParam(":event_name", $_SESSION['event_name'], PDO::PARAM_STR);
$stmt->execute();
$data = $stmt->fetchAll(PDO::FETCH_ASSOC);


$latest_stmt = $db_pdo->prepare('SELECT `Time`, `current_participants`, `total_participants` FROM event_records WHERE `event_name` = :event_name ORDER BY `Time` DESC LIMIT 1');
$latest_stmt->bindParam(":event_name", $_SESSION['event_name'], PDO::PARAM_STR);
$latest_stmt->execute();
$latest_data = $latest_stmt->fetch(PDO::FETCH_ASSOC);

$labels = [];
$current_values = [];
$total_values = [];

foreach ($data as $row) {
    $labels[] = $row['TimeGroup'];
    $current_values[] = (int) $row['current_participants'];
    // $total_values[] = (int) $row['total_participants'];
}
?>

<script>
    console.log(<?php echo json_encode($data); ?>);
    console.log(<?php echo json_encode($latest_data); ?>);
</script>

<script>
    // Fixed: Assigned the properties from $latest_data array safely using null coalescing operator
    document.getElementById('currentParticipants').innerText = <?php echo json_encode($latest_data['current_participants'] ?? 0); ?>;
    document.getElementById('totalParticipants').innerText = <?php echo json_encode($latest_data['total_participants'] ?? 0); ?>;
</script>

<script>
    const chartLabels = <?php echo json_encode($labels); ?>;
    const currentParticipantsData = <?php echo json_encode($current_values); ?>;
    const totalParticipantsData = <?php echo json_encode($total_values); ?>;
    const ctx = document.getElementById('peopleCountChart').getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Current Participants',
                    data: currentParticipantsData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    tension: 0.1
                },
                /*{
                    label: 'Total Participants',
                    data: totalParticipantsData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    tension: 0.1
                }*/
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
</script>