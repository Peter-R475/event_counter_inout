<?php
include 'connect.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($_POST['username']) && !empty($_POST['password'])) {
        $username = $_POST['username'];
        // Compute MD5 hash of the password
        $hashed_password = md5($_POST['password']);

        try {
            $stmt = $db_staff_pdo->prepare('INSERT INTO `staff_info` (`staff_id`, `staff_pass`) VALUES (:user, :pass)');
            $stmt->bindParam(':user', $username);
            $stmt->bindParam(':pass', $hashed_password);

            if ($stmt->execute()) {
                echo "<script>alert('Registration successful'); window.location.href='login.php';</script>";
                exit();
            }
        } catch (PDOException $e) {
            echo "<script>alert('Error: Username might already exist.'); window.location.href='register.php';</script>";
            exit();
        }
    } else {
        echo "<script>alert('Please fill in all fields'); window.location.href='register.php';</script>";
        exit();
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register</title>
    <link rel="stylesheet" href="style/register.css">
</head>

<body>
    <div class="login-page">
        <h1>Admin Registration</h1>
        <form action="register.php" method="POST">
            <input type="text" name="username" placeholder="Username" required>
            <input type="password" name="password" placeholder="Password" required>
            <input type="submit" value="Register">
        </form>
        <p><a href="login.php">Back to Login</a></p>
    </div>
</body>

</html>