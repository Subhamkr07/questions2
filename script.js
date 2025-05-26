// DOM Elements
const titleScreen = document.getElementById('title-screen');
const categoryScreen = document.getElementById('category-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const startBtn = document.getElementById('start-btn');
const categoryBtns = document.querySelectorAll('.category-btn');
const currentCategoryDisplay = document.getElementById('current-category');
const currentLevelDisplay = document.getElementById('current-level');
const questionText = document.getElementById('question-text');
const optionBtns = document.querySelectorAll('.option-btn');
const timerBar = document.getElementById('timer-bar');
const timerDisplay = document.getElementById('timer-display');
const failBtn = document.getElementById('fail-btn');

const correctCountDisplay = document.getElementById('correct-count');
const wrongCountDisplay = document.getElementById('wrong-count');
const levelStatusDisplay = document.getElementById('level-status');
const nextLevelBtn = document.getElementById('next-level-btn');
const retryBtn = document.getElementById('retry-btn');
const backToCategoriesBtn = document.getElementById('back-to-categories-btn');
const gameOverMessage = document.getElementById('game-over-message');

// Game State Variables
let allQuestions = {}; // Will store questions from JSON
let currentCategory = '';
let currentLevel = 1;
let currentQuestionIndex = 0;
let score = 0;
let wrongAnswers = 0;
let timer;
const TIME_LIMIT = 23;
const REGULAR_LEVEL_PASS_SCORE = 7;
const MIXED_CATEGORY_LEVEL_PASS_SCORE = 30;
const REGULAR_QUESTIONS_PER_LEVEL = 10;
const MIXED_QUESTIONS_PER_LEVEL = 36;
const MAX_REGULAR_LEVELS = 6;
const MAX_MIXED_LEVELS = 10;

// --- Utility Functions ---

function showScreen(screen) {
    const screens = [titleScreen, categoryScreen, quizScreen, resultScreen];
    screens.forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none'; // Temporarily hide to prevent layout issues during transition
    });
    screen.style.display = 'flex'; // Show before adding active class
    setTimeout(() => {
        screen.classList.add('active');
    }, 10); // Small delay to allow display property to apply
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function resetQuizState() {
    currentLevel = 1;
    currentQuestionIndex = 0;
    score = 0;
    wrongAnswers = 0;
    clearTimeout(timer);
    timerBar.style.width = '100%';
    timerBar.style.backgroundColor = 'var(--primary-color)';
    gameOverMessage.classList.add('hidden');
}

function startTimer() {
    let timeLeft = TIME_LIMIT;
    timerDisplay.textContent = timeLeft;
    timerBar.style.width = '100%';
    timerBar.style.backgroundColor = 'var(--primary-color)';

    timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        const percentage = (timeLeft / TIME_LIMIT) * 100;
        timerBar.style.width = `${percentage}%`;

        if (percentage <= 20) {
            timerBar.style.backgroundColor = 'var(--danger-color)';
        } else if (percentage <= 50) {
            timerBar.style.backgroundColor = 'var(--accent-color)';
        } else {
            timerBar.style.backgroundColor = 'var(--primary-color)';
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            handleAnswer(null, true); // Time's up, automatically move to next question
        }
    }, 1000);
}

// --- Quiz Logic Functions ---

async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        allQuestions = await response.json();
        console.log("Questions loaded:", allQuestions);
    } catch (error) {
        console.error("Error loading questions:", error);
        alert("Failed to load quiz questions. Please try again later.");
    }
}

function getCategoryQuestions(category, level) {
    if (category === "All Sections Mix") {
        return generateMixedCategoryQuestions(level);
    }
    // Access questions via the nested structure
    const levelQuestions = allQuestions.categories[category].find(l => l[`level${level}`])[`level${level}`];
    return shuffleArray([...levelQuestions]); // Return a shuffled copy
}

function generateMixedCategoryQuestions(level) {
    const mixedQuestions = [];
    const categories = Object.keys(allQuestions.categories).filter(cat => cat !== "All Sections Mix");
    const questionsPerCategory = Math.ceil(MIXED_QUESTIONS_PER_LEVEL / categories.length);

    let allAvailableQuestions = [];
    categories.forEach(cat => {
        for (let i = 1; i <= MAX_REGULAR_LEVELS; i++) { // Include questions from all levels
            const levelData = allQuestions.categories[cat].find(l => l[`level${i}`]);
            if (levelData) {
                allAvailableQuestions = allAvailableQuestions.concat(levelData[`level${i}`]);
            }
        }
    });

    // Ensure questions are unique within this specific mixed level
    const uniqueQuestions = new Set();
    const tempMixedQuestions = [];

    while (tempMixedQuestions.length < MIXED_QUESTIONS_PER_LEVEL && allAvailableQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * allAvailableQuestions.length);
        const question = allAvailableQuestions[randomIndex];

        // Create a unique identifier for the question (e.g., question text + first option)
        const questionIdentifier = `${question.question}-${question.options[0]}`;

        if (!uniqueQuestions.has(questionIdentifier)) {
            tempMixedQuestions.push(question);
            uniqueQuestions.add(questionIdentifier);
        }
        // Remove the question from consideration for current level to ensure uniqueness for current level
        allAvailableQuestions.splice(randomIndex, 1);
    }

    return shuffleArray(tempMixedQuestions);
}


function displayQuestion() {
    clearInterval(timer);
    if (!allQuestions[currentCategory] && currentCategory !== "All Sections Mix") {
        console.error("Questions for category not found:", currentCategory);
        alert("Error loading questions for this category.");
        showScreen(categoryScreen);
        return;
    }

    const questionsForLevel = getCategoryQuestions(currentCategory, currentLevel);

    if (currentQuestionIndex >= questionsForLevel.length) {
        // End of level
        showResultScreen();
        return;
    }

    const questionData = questionsForLevel[currentQuestionIndex];

    currentCategoryDisplay.textContent = `Category: ${currentCategory}`;
    currentLevelDisplay.textContent = `Level: ${currentLevel}`;
    questionText.textContent = questionData.question;

    // Reset button states
    optionBtns.forEach(btn => {
        btn.classList.remove('correct', 'incorrect');
        btn.disabled = false;
        btn.style.opacity = '0'; // For re-animation
        btn.style.transform = 'translateY(30px)'; // For re-animation
    });

    shuffleArray(questionData.options); // Shuffle options
    optionBtns.forEach((btn, index) => {
        btn.textContent = questionData.options[index];
        btn.setAttribute('data-answer', questionData.options[index]); // Store actual option text
        btn.style.animation = `slideInBottom 0.4s ease-out forwards ${0.1 * index}s`;
    });

    startTimer();
}

function handleAnswer(selectedOptionText, timedOut = false) {
    clearInterval(timer);
    const questionsForLevel = getCategoryQuestions(currentCategory, currentLevel);
    const currentQ = questionsForLevel[currentQuestionIndex];
    const correctAnswer = currentQ.correctAnswer;

    let isCorrect = false;

    if (timedOut) {
        wrongAnswers++;
        // No visual feedback for timed out, just move on
    } else {
        optionBtns.forEach(btn => btn.disabled = true); // Disable all options after selection

        if (selectedOptionText === correctAnswer) {
            isCorrect = true;
            score++;
            // Find the correct button and mark it
            Array.from(optionBtns).find(btn => btn.getAttribute('data-answer') === correctAnswer).classList.add('correct');
        } else {
            wrongAnswers++;
            // Mark selected as incorrect, and correct as correct
            Array.from(optionBtns).find(btn => btn.getAttribute('data-answer') === selectedOptionText).classList.add('incorrect');
            Array.from(optionBtns).find(btn => btn.getAttribute('data-answer') === correctAnswer).classList.add('correct');
        }
    }

    // Wait briefly to show feedback then go to next question
    setTimeout(() => {
        currentQuestionIndex++;
        displayQuestion();
    }, timedOut ? 0 : 1500); // No delay if timed out, 1.5s delay if user selected
}

function handleFail() {
    clearInterval(timer);
    const questionsForLevel = getCategoryQuestions(currentCategory, currentLevel);
    const currentQ = questionsForLevel[currentQuestionIndex];
    const correctAnswer = currentQ.correctAnswer;

    wrongAnswers++; // Mark as wrong since they "failed"

    optionBtns.forEach(btn => {
        btn.disabled = true;
        if (btn.getAttribute('data-answer') === correctAnswer) {
            btn.classList.add('correct');
        } else {
            btn.classList.add('incorrect'); // Show others as incorrect
        }
    });

    setTimeout(() => {
        currentQuestionIndex++;
        displayQuestion();
    }, 2000); // Show answer for 2 seconds
}


function showResultScreen() {
    showScreen(resultScreen);
    correctCountDisplay.textContent = score;
    wrongCountDisplay.textContent = wrongAnswers;

    const questionsPerLevel = (currentCategory === "All Sections Mix") ? MIXED_QUESTIONS_PER_LEVEL : REGULAR_QUESTIONS_PER_LEVEL;
    const requiredPassScore = (currentCategory === "All Sections Mix") ? MIXED_CATEGORY_LEVEL_PASS_SCORE : REGULAR_LEVEL_PASS_SCORE;
    const maxLevels = (currentCategory === "All Sections Mix") ? MAX_MIXED_LEVELS : MAX_REGULAR_LEVELS;

    nextLevelBtn.classList.add('hidden');
    retryBtn.classList.add('hidden');
    backToCategoriesBtn.classList.remove('hidden'); // Always show this

    if (score >= requiredPassScore) {
        levelStatusDisplay.textContent = `Congratulations! You passed Level ${currentLevel}!`;
        levelStatusDisplay.style.color = 'var(--primary-color)';

        if (currentLevel < maxLevels) {
            nextLevelBtn.classList.remove('hidden');
        } else {
            levelStatusDisplay.textContent = `Amazing! You've completed all levels in ${currentCategory}!`;
            levelStatusDisplay.style.color = 'var(--secondary-color)';
            gameOverMessage.textContent = 'Game Over! You are a Quiz Master!';
            gameOverMessage.classList.remove('hidden');
        }
    } else {
        levelStatusDisplay.textContent = `Oops! You need ${requiredPassScore} correct answers to pass.`;
        levelStatusDisplay.style.color = 'var(--danger-color)';
        retryBtn.classList.remove('hidden');
        gameOverMessage.textContent = 'Keep practicing to become a Quiz Master!';
        gameOverMessage.classList.remove('hidden');
    }
}


// --- Event Listeners ---

startBtn.addEventListener('click', () => {
    showScreen(categoryScreen);
});

categoryBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentCategory = e.target.dataset.category;
        resetQuizState();
        showScreen(quizScreen);
        displayQuestion();
    });
});

optionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        handleAnswer(e.target.dataset.answer);
    });
});

failBtn.addEventListener('click', handleFail);

nextLevelBtn.addEventListener('click', () => {
    currentLevel++;
    resetQuizState(); // Resets score, wrong answers, question index for new level
    showScreen(quizScreen);
    displayQuestion();
});

retryBtn.addEventListener('click', () => {
    resetQuizState(); // Resets score, wrong answers, question index for retry
    showScreen(quizScreen);
    displayQuestion();
});

backToCategoriesBtn.addEventListener('click', () => {
    resetQuizState();
    showScreen(categoryScreen);
});

// Initial load
loadQuestions();
showScreen(titleScreen);