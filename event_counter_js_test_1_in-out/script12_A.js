let yolo_model;
let frameCount = 0;
let lastTime = Date.now();
// let peopleCount = 0;
const stopButton = document.getElementById('stopBtn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startButton = document.getElementById('startBtn');
const sourceButton = document.getElementById('sourceBtn');
const resetButton = document.getElementById('resetBtn')
const ctx = canvas.getContext('2d');
let countingZone = { x: 320, y: 240, width: 1200, height: 800 };
let trackedPersons = {};
let nextPersonId = 1;
let totalParticipants = 0;
let currentParticipants = 0;
const maxDisplacement = 400;
const maxTrackAge = 3;
let isProcessingActive = false;
let currentSource = 'video';
const FIVE_MINUTES = 5 * 60 * 1000;
const currentDateTime = new Date();
const day = currentDateTime.getDate();
const month = currentDateTime.getMonth();
const year = currentDateTime.getFullYear();
const hours = currentDateTime.getHours();
const minutes = currentDateTime.getMinutes();
const seconds = currentDateTime.getSeconds();
const time = day + ":" + month + ":" + year + ":" + hours + ":" + minutes + ":" + seconds;

let countIn = 0;
let countLeft = 0;

// Fetch the session data from the PHP backend asynchronously

const syncInterval = setInterval(() => {
    // Generate the current ISO timestamp right before sending

    sendToBackend(countIn, countLeft, time);
}, FIVE_MINUTES);

async function checkSession() {
    try {
        const response = await fetch('get_session.php');
        const sessionData = await response.json();

        console.log("Fetched session data:", sessionData);

        if (sessionData.total_participants) {
            console.log("Total:", sessionData.total_participants);
            totalParticipants = sessionData.total_participants;
        }
    } catch (error) {
        console.error("Error fetching session:", error);
    }
}


resetButton.addEventListener('click', function () {
    const payload = {
        Command: 'Reset'
    };

    fetch('reset_event_counter.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            // 2. Explicitly handle server-side errors (4xx, 5xx)
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                console.log('Success:', data.message);
                // Insert UI update logic here (e.g., changing counter display to 0)
            } else {
                console.warn('Application Warning:', data.message);
            }
        })
        .catch(error => {
            // Catches both network failures AND errors thrown from the response block above
            console.error('Error communicating with PHP:', error.message);
        });
    location.reload();
});


stopButton.addEventListener('click', function () {

    isProcessingActive = false;

    video.pause();

})

sourceButton.addEventListener('click', async () => {

    if (currentSource === 'video') {
        currentSource = 'live_cam';
        sourceButton.textContent = "Switch to Video File";
    } else {
        currentSource = 'video';
        sourceButton.textContent = "Switch to Live Cam";
    }

    try {
        await setupCamera();
        isProcessingActive = false;

    } catch (err) {
        console.error("Failed to switch media source:", err);
    }
});

function stopCurrentStream() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    video.removeAttribute('src');
    video.load();
}

async function setupCamera() {
    stopCurrentStream();

    if (currentSource === 'video') {
        return new Promise((resolve, reject) => {
            video.crossOrigin = 'anonymous';
            video.loop = true;

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };

            video.oncanplaythrough = async () => {
                try {

                    resolve(video);
                } catch (err) {
                    reject(new Error("Playback blocked: " + err.message));
                }
            };

            video.onerror = () => {
                reject(new Error("Failed to load video file."));
            };

            video.src = 'video/IMG_3517.MOV';
        });
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });

            return new Promise((resolve, reject) => {
                video.srcObject = stream;

                video.onloadeddata = async () => {
                    try {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        await video.play();
                        resolve(video);
                    } catch (err) {
                        reject(new Error("Playback failed: " + err.message));
                    }
                };

                video.onerror = () => {
                    reject(new Error("Video element error occurred."));
                };
            });
        } catch (error) {
            console.error("Error accessing camera:", error);
            throw error;
        }
    }
}

function setupZoneControls() {
    const inputX = document.getElementById('zoneX');
    const inputY = document.getElementById('zoneY');
    const inputW = document.getElementById('zoneW');
    const inputH = document.getElementById('zoneH');
    const inputAngle = document.getElementById('zoneAngle');

    function updateZone() {
        countingZone.x = parseInt(inputX.value, 10) || 0;
        countingZone.y = parseInt(inputY.value, 10) || 0;
        countingZone.width = parseInt(inputW.value, 10) || 0;
        countingZone.height = parseInt(inputH.value, 10) || 0;
        countingZone.angle = parseInt(inputAngle.value, 10) || 0;

        // Calculate center line coordinates (Vertical split)
        const centerX = countingZone.x + (countingZone.width / 2);

        countingZone.centerLine = {
            x1: centerX,
            y1: countingZone.y,
            x2: centerX,
            y2: countingZone.y + countingZone.height
        };

        // force a redraw so the box moves instantly
        if (!isProcessingActive) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            drawCountingZone();
        }
    }

    inputX.addEventListener('input', updateZone);
    inputY.addEventListener('input', updateZone);
    inputW.addEventListener('input', updateZone);
    inputH.addEventListener('input', updateZone);
    inputAngle.addEventListener('input', updateZone);
}

async function drawCountingZone() {
    const centerX = countingZone.x + (countingZone.width / 2);
    const centerY = countingZone.y + (countingZone.height / 2);
    const angleInRadians = ((countingZone.angle || 0) * Math.PI) / 180;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angleInRadians);
    ctx.translate(-centerX, -centerY);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.strokeRect(countingZone.x, countingZone.y, countingZone.width, countingZone.height);
    // Fallback calculation logic if updateZone has not executed yet
    const x1 = countingZone.centerLine ? countingZone.centerLine.x1 : countingZone.x + (countingZone.width / 2);
    const y1 = countingZone.centerLine ? countingZone.centerLine.y1 : countingZone.y;
    const x2 = countingZone.centerLine ? countingZone.centerLine.x2 : countingZone.x + (countingZone.width / 2);
    const y2 = countingZone.centerLine ? countingZone.centerLine.y2 : countingZone.y + countingZone.height;

    // Draw the center line
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

/* function isInsideCountingZone(x, y) {
    return x > countingZone.x && x < countingZone.x + countingZone.width &&
        y > countingZone.y && y < countingZone.y + countingZone.height;
}*/

async function loadModel() {
    document.getElementById('status').innerText = 'Loading Model...';

    try {

        const modelUrl = 'exp.onnx';


        yolo_model = await ort.InferenceSession.create(modelUrl, {
            executionProviders: ['webgpu', 'webgl', 'wasm']
        });

        document.getElementById('status').innerText = 'Ready';
        console.log("YOLOv8 ONNX model loaded successfully.");

    } catch (err) {
        document.getElementById('status').innerText = 'Failed to load model.';
        console.error("Error loading model:", err);
    }
}

function sendToBackend(total_count, current, time) {

    fetch('actions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Tme: time, total_participants: total_count, current_participants: current }) // Match PHP expected keys
    }).catch(err => console.error("Backend sync failed:", err));
}

async function detectPeople() {
    if (!yolo_model) return;

    let tensor;
    let outputMap;
    let outputTensor;

    try {
        // 1. Preprocess image data and transpose from BHWC [1,640,640,3] to BCHW [1,3,640,640]
        tensor = tf.tidy(() => {
            const input = tf.browser.fromPixels(video);
            const resized = tf.image.resizeBilinear(input, [640, 640]).div(255.0);
            const batched = resized.expandDims(0);
            return batched.transpose([0, 3, 1, 2]);
        });

        // 2. Convert to an ONNX compatible Float32 WebGL/WASM data array
        const tensorData = await tensor.data();
        const inputOrtTensor = new ort.Tensor('float32', tensorData, [1, 3, 640, 640]);

        // 3. Execute inference using ONNX Runtime session execution
        const feeds = { images: inputOrtTensor };
        outputMap = await yolo_model.run(feeds);

        // 4. Extract output matrix data (Shape: [1, 5, 8400])
        const outputName = yolo_model.outputNames[0];
        const rawOutput = outputMap[outputName];

        // 5. Convert back into a TFJS tensor layout to feed your existing post-processing pipe
        outputTensor = tf.tensor(rawOutput.data, rawOutput.dims);

        // Clear display canvas for updated tracking frame overlays
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawCountingZone();

        const [formattedBoxes, scores] = tf.tidy(() => {
            const output = outputTensor.squeeze();
            const transposed = output.transpose([1, 0]);

            const cx = transposed.slice([0, 0], [-1, 1]).squeeze();
            const cy = transposed.slice([0, 1], [-1, 1]).squeeze();
            const w = transposed.slice([0, 2], [-1, 1]).squeeze();
            const h = transposed.slice([0, 3], [-1, 1]).squeeze();

            const x1 = cx.sub(w.div(2));
            const y1 = cy.sub(h.div(2));
            const x2 = cx.add(w.div(2));
            const y2 = cy.add(h.div(2));

            const boxes = tf.stack([y1, x1, y2, x2], 1);
            const classScores = transposed.slice([0, 4], [-1, 1]).squeeze();

            return [boxes, classScores];
        });

        const maxOutputSize = 100;
        const iouThreshold = 0.50;
        const scoreThreshold = 0.20;

        const nmsIndices = await tf.image.nonMaxSuppressionAsync(
            formattedBoxes,
            scores,
            maxOutputSize,
            iouThreshold,
            scoreThreshold
        );

        const filteredBoxesTensor = tf.gather(formattedBoxes, nmsIndices);
        const filteredScoresTensor = tf.gather(scores, nmsIndices);

        const rawBoxes = await filteredBoxesTensor.array();
        const rawScores = await filteredScoresTensor.array();

        formattedBoxes.dispose();
        scores.dispose();
        nmsIndices.dispose();
        filteredBoxesTensor.dispose();
        filteredScoresTensor.dispose();

        const currentDetections = [];
        const scaleX = canvas.width / 640;
        const scaleY = canvas.height / 640;

        for (let i = 0; i < rawBoxes.length; i++) {
            const [y1, x1, y2, x2] = rawBoxes[i];
            const score = rawScores[i];

            const x = x1 * scaleX;
            const y = y1 * scaleY;
            const width = (x2 - x1) * scaleX;
            const height = (y2 - y1) * scaleY;

            currentDetections.push({
                centerX: x + (width / 2),
                centerY: y + (height / 2),
                box: [x, y, width, height],
                score: score
            });
        }

        // 1. Calculate the true, rotated world coordinates of the blue line endpoints
        const zoneCenterX = countingZone.x + (countingZone.width / 2);
        const zoneCenterY = countingZone.y + (countingZone.height / 2);
        const angleRad = ((countingZone.angle || 0) * Math.PI) / 180;
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);

        // Local unrotated line endpoints
        const lx1 = countingZone.centerLine ? countingZone.centerLine.x1 : zoneCenterX;
        const ly1 = countingZone.centerLine ? countingZone.centerLine.y1 : countingZone.y;
        const lx2 = countingZone.centerLine ? countingZone.centerLine.x2 : zoneCenterX;
        const ly2 = countingZone.centerLine ? countingZone.centerLine.y2 : countingZone.y + countingZone.height;

        // Helper to rotate a point around the zone center
        const getRotatedPoint = (x, y) => {
            const dx = x - zoneCenterX;
            const dy = y - zoneCenterY;
            return {
                x: zoneCenterX + (dx * cosA - dy * sinA),
                y: zoneCenterY + (dx * sinA + dy * cosA)
            };
        };

        const lineStart = getRotatedPoint(lx1, ly1);
        const lineEnd = getRotatedPoint(lx2, ly2);

        // Helper function: Returns true if segment AB intersects segment CD
        function intersects(A, B, C, D) {
            function ccw(P1, P2, P3) {
                return (P3.y - P1.y) * (P2.x - P1.x) > (P2.y - P1.y) * (P3.x - P1.x);
            }
            return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
        }

        // Helper function: Determines which side of the directed line string a point rests on
        // returns > 0 for one side, < 0 for the other
        function getSide(P, LStart, LEnd) {
            return (LEnd.x - LStart.x) * (P.y - LStart.y) - (LEnd.y - LStart.y) * (P.x - LStart.x);
        }

        let matchedDetections = new Set();
        let nextTrackedPersons = {};
        let backendUpdateNeeded = false;

        // Update existing tracks
        Object.keys(trackedPersons).forEach(id => {
            const track = trackedPersons[id];
            let closestDist = maxDisplacement;
            let matchedIdx = -1;

            currentDetections.forEach((det, idx) => {
                if (matchedDetections.has(idx)) return;
                const dist = Math.hypot(det.centerX - track.centerX, det.centerY - track.centerY);
                if (dist < closestDist) {
                    closestDist = dist;
                    matchedIdx = idx;
                }
            });

            if (matchedIdx !== -1) {
                const det = currentDetections[matchedIdx];
                matchedDetections.add(matchedIdx);

                const prevPoint = { x: track.centerX, y: track.centerY };
                const currPoint = { x: det.centerX, y: det.centerY };
                let counted = track.counted || false;

                // Check intersection across the actual rotated blue line segment
                if (!counted && intersects(prevPoint, currPoint, lineStart, lineEnd)) {
                    const prevSide = getSide(prevPoint, lineStart, lineEnd);

                    if (prevSide < 0) {
                        countIn++;
                        counted = true;
                        backendUpdateNeeded = true;
                        console.log(`ID crossed -> IN. Total In: ${countIn}`);
                    } else {
                        countLeft++;
                        counted = true;
                        backendUpdateNeeded = true;
                        console.log(`ID crossed -> LEFT. Total Left: ${countLeft}`);
                    }
                }

                nextTrackedPersons[id] = {
                    centerX: det.centerX,
                    centerY: det.centerY,
                    box: det.box,
                    score: det.score,
                    counted: counted,
                    missedFrames: 0
                };
            } else {
                const missedFrames = (track.missedFrames || 0) + 1;
                if (missedFrames <= maxTrackAge) {
                    nextTrackedPersons[id] = {
                        ...track,
                        missedFrames: missedFrames
                    };
                }
            }
        });

        // Register brand new tracks
        currentDetections.forEach((det, idx) => {
            if (matchedDetections.has(idx)) return;

            nextTrackedPersons[nextPersonId++] = {
                centerX: det.centerX,
                centerY: det.centerY,
                box: det.box,
                score: det.score,
                counted: false,
                missedFrames: 0
            };
        });

        // UI State sync
        document.getElementById('detections').innerText = `In: ${countIn} | Left: ${countLeft}`;
        trackedPersons = nextTrackedPersons;

        // Render bounding boxes
        Object.keys(trackedPersons).forEach(id => {
            const person = trackedPersons[id];
            if (person.missedFrames > 0) return;

            const [x, y, width, height] = person.box;

            ctx.strokeStyle = person.counted ? '#ff00ff' : '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = '24px Arial';
            ctx.fillText(`ID: ${id} (${Math.round(person.score * 100)}%)`, x, y > 20 ? y - 10 : 20);
        });

        if (backendUpdateNeeded) {
            sendToBackend(countIn, countLeft);
        }

    } catch (err) {
        console.error("Inference dropped frame or execution failed:", err);
    } finally {
        if (tensor) tensor.dispose();
        if (outputTensor) outputTensor.dispose();
    }

    frameCount++;
    const now = Date.now();
    if (now - lastTime >= 1000) {
        document.getElementById('fps').innerText = frameCount;
        frameCount = 0;
        lastTime = now;
    }
}

async function predictionLoop() {
    if (!isProcessingActive) return;

    //await fetch_data_sql();
    await detectPeople();
    setTimeout(predictionLoop, 100);
}

function Start() {
    startButton.addEventListener('click', () => {
        if (!isProcessingActive) {
            isProcessingActive = true;

            predictionLoop();
        }
        video.play()
            .then(() => {
                console.log("Video playback started successfully.");
            })
            .catch((error) => {
                console.error("Error attempting to play video:", error);
            });
    });
}

/*async function fetch_data_sql() {
    try {
        const response = await fetch('get_element.php');
        const data = await response.json();
        peopleCount = data.peopleCount;
        document.getElementById('detections').innerText = data.currentParticipants;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}*/

async function run() {
    try {
        await setupCamera();
        await loadModel();
        await checkSession();
        await setupZoneControls();
        drawCountingZone();
        await Start();

        if (isProcessingActive) {
            predictionLoop();
        }

    } catch (error) {
        if (error.name === 'NotReadableError') {
            document.getElementById('status').innerText = 'Camera blocked by another app/tab.';
        } else if (error.name === 'NotAllowedError') {
            document.getElementById('status').innerText = 'Initialization error.';
        } else {
            document.getElementById('status').innerText = 'Error: ' + error.message;
        }
    }
}
run();