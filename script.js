// ==========================================================
// 🚨 Google Sheet ID 설정 🚨
// ==========================================================
const SHEET_ID = '1qldoMY1EZzjbREa26MdLuW7GH_t5OkqvP5Bysd62hRo'; 
const SHEET_NAME = 'Sheet1'; 
const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

// 🚨🚨🚨 1. 여기에 GAS Web App URL을 반드시 붙여넣으세요! 🚨🚨🚨
// (이 URL로 완료 신호가 전송됩니다.)
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxHOQvOFvZnhT2ppbA6I10X0BjbViv1Q_kEceg-8ngg98mClh6zdlZy78kUHP87OQ6i/exec'; 

// ==========================================================
// 💡 DOM 요소 및 상태 변수
// ==========================================================
const display = document.getElementById('display');
const startStopBtn = document.getElementById('startStopBtn');
const checkBtn = document.getElementById('checkBtn');
const currentTaskTitle = document.getElementById('currentTaskTitle');
const nextTaskInfo = document.getElementById('nextTaskInfo');

let routineList = []; 
let currentTaskIndex = 0;
let timer;
let isRunning = false;
let remainingTime;

// ==========================================================
// 💡 데이터 로드 및 초기화 함수
// ==========================================================
async function loadRoutineData() {
    try {
        const response = await fetch(URL);
        const data = await response.text();
        
        const jsonText = data.substring(data.indexOf('(') + 1, data.lastIndexOf(')'));
        const json = JSON.parse(jsonText);
        const rows = json.table.rows;
        
        routineList = rows.map(row => ({
            name: row.c[0] && row.c[0].v ? row.c[0].v : '', 
            duration: row.c[1] && row.c[1].v ? Number(row.c[1].v) * 60 : 0 
        })).filter(task => task.name && task.duration > 0); 

        initializeTask();
        
    } catch (error) {
        currentTaskTitle.textContent = "데이터 로드 실패!";
        nextTaskInfo.textContent = "시트 설정 확인 필요.";
    }
}

function initializeTask() {
    if (currentTaskIndex < routineList.length) {
        const task = routineList[currentTaskIndex];
        currentTaskTitle.textContent = task.name;
        remainingTime = task.duration; 
        display.textContent = formatTime(remainingTime);
        updateNextTaskInfo();
        startStopBtn.disabled = false;
        checkBtn.disabled = false;
    } else {
        currentTaskTitle.textContent = "루틴 완료!";
        display.textContent = "DONE";
        startStopBtn.disabled = true;
        checkBtn.disabled = true;
        nextTaskInfo.textContent = '모든 루틴 완료!';
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateNextTaskInfo() {
    if (currentTaskIndex + 1 < routineList.length) {
        const nextTask = routineList[currentTaskIndex + 1];
        nextTaskInfo.textContent = `다음 할 일: ${nextTask.name} (${Math.floor(nextTask.duration / 60)}분)`;
    } else {
        nextTaskInfo.textContent = '마지막 루틴입니다. 화이팅!';
    }
}

function startStopTimer() {
    if (isRunning) {
        clearInterval(timer);
        isRunning = false;
        startStopBtn.textContent = '재개';
    } else if (remainingTime > 0) {
        isRunning = true;
        startStopBtn.textContent = '정지';

        timer = setInterval(() => {
            remainingTime--;
            display.textContent = formatTime(remainingTime);

            if (remainingTime <= 0) {
                clearInterval(timer);
                isRunning = false;
                alert(`${routineList[currentTaskIndex].name} 시간이 종료되었습니다!`);
                startStopBtn.textContent = '시작'; 
            }
        }, 1000);
    }
}

// 🚨 기록 기능 추가 (GAS로 데이터 전송) 🚨
async function recordCompletion(routineName) {
    if (!GAS_WEB_APP_URL.includes('script.google.com')) {
        console.error("GAS Web App URL이 설정되지 않았습니다. 기록할 수 없습니다.");
        return;
    }
    
    try {
        await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ routine: routineName })
        });
        console.log(`[기록 성공 신호 전송] ${routineName}`);

    } catch (error) {
        console.error("기록 데이터 전송 오류:", error);
    }
}

// 🚨 moveToNextTask 함수 수정 (기록 기능 호출 및 이동) 🚨
function moveToNextTask() {
    if (currentTaskIndex < routineList.length) {
        const completedRoutineName = routineList[currentTaskIndex].name;
        recordCompletion(completedRoutineName); 
    }

    clearInterval(timer);
    isRunning = false;
    startStopBtn.textContent = '시작';
    
    currentTaskIndex++; 

    initializeTask(); 
}

// ==========================================================
// 💡 이벤트 리스너 및 시작
// ==========================================================
startStopBtn.addEventListener('click', startStopTimer);
checkBtn.addEventListener('click', moveToNextTask);
loadRoutineData();