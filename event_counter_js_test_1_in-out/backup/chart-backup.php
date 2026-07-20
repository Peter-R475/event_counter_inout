<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="style/chart_style.css">
</head>

<body>
    <header class="header">
        <h1>Dashboard System</h1>
    </header>

    <section class="dashboard">
        <div class="card">
            <div class="card-title">Total Participants</div>
            <div class="card-value" id="totalParticipants"></div>
        </div>
        <div class="card">
            <div class="card-title">Status</div>
            <div class="card-value">Active</div>
        </div>
        <div class="card">
            <div class="card-title">Count</div>
            <div class="card-value" id="currentParticipants"></div>
        </div>
    </section>

    <main class="chart-container">
        <canvas id="peopleCountChart"></canvas>
    </main>

    <footer class="footer">
        &copy; 2026 System Monitor
    </footer>
    <?php include 'chart_generation.php'; ?>
</body>

</html>