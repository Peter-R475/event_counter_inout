let yolo_model;
let frameCount = 0;
let lastTime = Date.now();
let peopleCount = 0;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startButton = document.getElementById('startBtn');
const ctx = canvas.getContext('2d');
let countingZone = { x: 320, y: 240, width: 1200, height: 800 };
let isResizing = false;
let trackedPersons = {}; // Changed to an object for O(1) ID lookups
let nextPersonId = 1;
let totalParticipants = 0;
let currentParticipants = 0;
const maxDisplacement = 400; // Max pixels a person can move between frames
const maxTrackAge = 30;
const videoElement = document.getElementById('myVideo');
const canvasElement = document.getElementById('myCanvas');

// Time
const currentDateTime = new Date();
const day = currentDateTime.getDate();
const month = currentDateTime.getMonth();
const year = currentDateTime.getFullYear();
const hours = currentDateTime.getHours();       // Returns 0 - 23
const minutes = currentDateTime.getMinutes();   // Returns 0 - 59
const seconds = currentDateTime.getSeconds();   // Returns 0 - 59
const time = day + ":" + month + ":" + year + ":" + hours + ":" + minutes + ":" + seconds;

// open-video
async function setupCamera() {
    // 1. Clear any active webcam tracks if they exist
    await loadModel();
    await detectPeople();
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    // 2. Return the Promise and configure events BEFORE loading data
    return new Promise((resolve, reject) => {
        video.crossOrigin = 'anonymous';
        video.loop = true;

        // Triggered when video dimensions are known
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        };

        // Triggered when enough frames are buffered to play safely
        video.oncanplaythrough = async () => {
            try {
                // await video.play();
                resolve(video); // Resolves the promise to continue run()
            } catch (err) {
                reject(new Error("Playback blocked: " + err.message));
            }
        };

        video.onerror = () => {
            reject(new Error("Failed to load video file. Check path or codec."));
        };

        // 3. Assign the source path LAST to kick off the event pipeline
        video.src = 'people_walking.mp4';
    });
}

// open-camera
/*async function setupCamera() {
    // 1. Clear previous stream tracks if they exist
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    try {
        // 2. Request camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        return new Promise((resolve, reject) => {
            // 3. Set the stream source
            video.srcObject = stream;

            // 4. Trigger logic when video is ready to play
            video.onloadeddata = async () => {
                try {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    // Crucial step: Start video playback
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
}*/

function setupZoneControls() {
    const inputX = document.getElementById('zoneX');
    const inputY = document.getElementById('zoneY');
    const inputW = document.getElementById('zoneW');
    const inputH = document.getElementById('zoneH');

    function updateZone() {
        countingZone.x = parseInt(inputX.value, 10);
        countingZone.y = parseInt(inputY.value, 10);
        countingZone.width = parseInt(inputW.value, 10);
        countingZone.height = parseInt(inputH.value, 10);
    }

    inputX.addEventListener('input', updateZone);
    inputY.addEventListener('input', updateZone);
    inputW.addEventListener('input', updateZone);
    inputH.addEventListener('input', updateZone);
}

async function drawCountingZone() {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.strokeRect(countingZone.x, countingZone.y, countingZone.width, countingZone.height);
}

function isInsideCountingZone(x, y) {
    return x > countingZone.x && x < countingZone.x + countingZone.width &&
        y > countingZone.y && y < countingZone.y + countingZone.height;
}

async function loadModel() {
    document.getElementById('status').innerText = 'Loading Model...';

    try {
        const modelUrl = 'yolov8n_web_model/model.json';
        yolo_model = await tf.loadGraphModel(modelUrl);
        document.getElementById('status').innerText = 'Ready';

    } catch (err) {
        console.error("Error loading model:", err);
    }
}

function sendToBackend(total_count, current) {
    fetch('actions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Tme: time, total_participants: total_count, current_participants: current }) // Match PHP expected keys
    }).catch(err => console.error("Backend sync failed:", err));
}

async function detectPeople() {
    if (!yolo_model) return;

    let tensor;
    let result;

    try {
        // 1. Preprocess the frame into a 4D Tensor matching YOLO input dimensions
        tensor = tf.tidy(() => {
            const input = tf.browser.fromPixels(video);
            return tf.image.resizeBilinear(input, [640, 640])
                .div(255.0)
                .expandDims(0);
        });

        // 2. Execute Prediction
        result = yolo_model.execute(tensor);
        const outputTensor = Array.isArray(result) ? result[0] : result;

        // 3. Clear canvas and redraw frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawCountingZone();

        // 4. Extract raw scores and boxes
        const { rawBoxes, rawScores } = tf.tidy(() => {
            const output = outputTensor.squeeze(); // [84, 8400]
            const transposed = output.transpose([1, 0]); // [8400, 84]

            // Convert [cx, cy, w, h] to [y1, x1, y2, x2]
            const cx = transposed.slice([0, 0], [-1, 1]).squeeze();
            const cy = transposed.slice([0, 1], [-1, 1]).squeeze();
            const w = transposed.slice([0, 2], [-1, 1]).squeeze();
            const h = transposed.slice([0, 3], [-1, 1]).squeeze();

            const x1 = cx.sub(w.div(2));
            const y1 = cy.sub(h.div(2));
            const x2 = cx.add(w.div(2));
            const y2 = cy.add(h.div(2));

            const formattedBoxes = tf.stack([y1, x1, y2, x2], 1);
            const scores = transposed.slice([0, 4], [-1, 1]).squeeze();

            return { rawBoxes: formattedBoxes.arraySync(), rawScores: scores.arraySync() };
        });

        // 5. Execute Non-Maximum Suppression
        const numBoxes = rawScores.length;
        const maxOutputSize = 20;
        const iouThreshold = 0.50;
        const scoreThreshold = 0.50;

        const nmsIndices = await tf.image.nonMaxSuppressionAsync(
            tf.tensor2d(rawBoxes, [numBoxes, 4]),
            tf.tensor1d(rawScores),
            maxOutputSize,
            iouThreshold,
            scoreThreshold
        );
        const indices = await nmsIndices.array();
        nmsIndices.dispose();

        const currentDetections = [];
        const scaleX = canvas.width / 640;
        const scaleY = canvas.height / 640;

        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            const [y1, x1, y2, x2] = rawBoxes[idx];
            const score = rawScores[idx];

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

        // 6. Robust Object Tracking (Centroid Matching Engine with Age Verification)
        let matchedDetections = new Set();
        let nextTrackedPersons = {};
        let backendUpdateNeeded = false;

        // Try to match existing tracks to new detections
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

                const isInsideNow = isInsideCountingZone(det.centerX, det.centerY);
                const isInsideBefore = track.isInside;
                let counted = track.counted;

                // Scenario A: Person enters the zone
                if (isInsideNow && !isInsideBefore) {
                    currentParticipants++;
                    if (!counted) {
                        totalParticipants++;
                        counted = true;
                    }
                    backendUpdateNeeded = true;
                    console.log("people count = ", totalParticipants);
                    console.log("current count = ", currentParticipants);
                }
                // Scenario B: Person leaves the zone
                else if (isInsideBefore && !isInsideNow) {
                    currentParticipants = Math.max(0, currentParticipants - 1);
                    backendUpdateNeeded = true;
                    console.log("people count = ", totalParticipants);
                    console.log("current count = ", currentParticipants);
                }

                nextTrackedPersons[id] = {
                    centerX: det.centerX,
                    centerY: det.centerY,
                    box: det.box,
                    score: det.score,
                    isInside: isInsideNow,
                    counted: counted,
                    missedFrames: 0 // Reset missing counter on successful match
                };
            }
            else {
                // Track missing tracking matches without immediate execution drop
                const missedFrames = (track.missedFrames || 0) + 1;

                if (missedFrames <= maxTrackAge) {
                    nextTrackedPersons[id] = {
                        ...track,
                        missedFrames: missedFrames
                    };
                } else if (track.isInside) {
                    // Evict track and update state counters after threshold exhaustion
                    currentParticipants = Math.max(0, currentParticipants - 1);
                    backendUpdateNeeded = true;
                }
            }
        });

        // Register remaining completely unmatched detections as brand new tracks
        currentDetections.forEach((det, idx) => {
            if (matchedDetections.has(idx)) return;

            const isInsideNow = isInsideCountingZone(det.centerX, det.centerY);
            let counted = false;

            if (isInsideNow) {
                totalParticipants++;
                currentParticipants++;
                counted = true;
                backendUpdateNeeded = true;
            }

            nextTrackedPersons[nextPersonId++] = {
                centerX: det.centerX,
                centerY: det.centerY,
                box: det.box,
                score: det.score,
                isInside: isInsideNow,
                counted: counted,
                missedFrames: 0
            };
        });
        console.log("current count =", currentParticipants);
        document.getElementById('detections').innerText = currentParticipants;
        //document.getElementById('total').innerText = totalParticipants;
        console.log("total count =", totalParticipants);
        trackedPersons = nextTrackedPersons;

        // 7. Visual Rendering & Telemetry Output
        Object.keys(trackedPersons).forEach(id => {
            const person = trackedPersons[id];

            // Skip rendering bounding boxes for tracks currently hidden/ghosted
            if (person.missedFrames > 0) return;

            const [x, y, width, height] = person.box;

            ctx.strokeStyle = person.isInside ? '#ff00ff' : '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = '24px Arial';
            ctx.fillText(`ID: ${id} (${Math.round(person.score * 100)}%)`, x, y > 20 ? y - 10 : 20);
        });
        if (backendUpdateNeeded) {
            sendToBackend(
                totalParticipants,
                currentParticipants
            );
        }

    } catch (err) {
        console.error("Inference dropped frame or execution failed:", err);
    } finally {
        if (tensor) tensor.dispose();
        if (result) tf.dispose(result);
    }

    // Performance telemetry
    frameCount++;
    const now = Date.now();
    if (now - lastTime >= 1000) {
        document.getElementById('fps').innerText = frameCount;
        frameCount = 0;
        lastTime = now;
    }
}

function Start() {
    startButton.addEventListener('click', () => {
        video.play()
            .then(() => {
                console.log("Video playback started successfully.");
            })
            .catch((error) => {
                console.error("Error attempting to play video:", error);
            });
    });
}

async function fetch_data_sql() {
    try {
        const response = await fetch('get_element.php');
        const data = await response.json();
        peopleCount = data.peopleCount;
        document.getElementById('detections').innerText = data.currentParticipants;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function run() {
    try {
        await setupCamera();
        await loadModel();
        await setupZoneControls();
        await Start();

        async function predictionLoop() {
            await fetch_data_sql();
            await detectPeople();
            setTimeout(predictionLoop, 100);
        }
        predictionLoop();

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