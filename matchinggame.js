// Path to the QuestionBank folder
const QUESTION_BANK_PATH = './QuestionBank/';

// Global Variables
let gameData = null;
let score = 0;
let attempts = {};
let totalMatches = 0;
let selectedQuestions = [];

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const completionScreen = document.getElementById('completion-screen');
const gameSelect = document.getElementById('game-select');
const startButton = document.getElementById('start-button');
const scoreSpan = document.getElementById('score');
const definitionsArea = document.getElementById('definitions-area');
const termsArea = document.getElementById('terms-area');
const completionMessage = document.getElementById('completion-message');
const percentageScoreSpan = document.getElementById('percentage-score');
const tryAgainButton = document.getElementById('try-again-button');
const backHomeButton = document.getElementById('back-home-button');

/**
 * Initialize the game by loading available games and setting up event listeners.
 */
document.addEventListener("DOMContentLoaded", function() {
    loadGames();
    startButton.addEventListener("click", startGame);
    tryAgainButton.addEventListener("click", retryGame);
    backHomeButton.addEventListener("click", backToHome);
});

/**
 * Fetch the games.json manifest and populate the game selection dropdown.
 */
function loadGames() {
    fetch(`${QUESTION_BANK_PATH}games.json`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            populateGameSelect(data.games);
        })
        .catch(error => {
            console.error("Error loading games.json:", error);
            alert("Failed to load games. Please check the console for details.");
        });
}

/**
 * Populate the game selection dropdown with available games.
 * @param {Array} games - Array of game objects from games.json.
 */
function populateGameSelect(games) {
    gameSelect.innerHTML = ""; // Clear existing options

    if (games.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No games available";
        gameSelect.appendChild(option);
        startButton.disabled = true;
        return;
    }

    games.forEach(game => {
        const option = document.createElement('option');
        option.value = game.file;
        option.textContent = game.title;
        gameSelect.appendChild(option);
    });
}

/**
 * Start the selected game by fetching its JSON data and initializing the game.
 */
function startGame() {
    const selectedGameFile = gameSelect.value;

    if (!selectedGameFile) {
        alert("Please select a game to start.");
        return;
    }

    fetch(`${QUESTION_BANK_PATH}${selectedGameFile}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load game data: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            gameData = data;
            initializeGame();
        })
        .catch(error => {
            console.error("Error loading game data:", error);
            alert("Failed to load game data. Please check the console for details.");
        });
}

/**
 * Initialize the game by resetting variables, displaying definitions and terms.
 */
function initializeGame() {
    // Reset Variables
    score = 0;
    attempts = {};
    totalMatches = gameData.questions.length;

    // Use all questions from the selected game
    selectedQuestions = [...gameData.questions];

    // Initialize Attempts
    selectedQuestions.forEach(q => {
        attempts[q.id] = 0;
    });

    // Hide Start Screen and Show Game Screen
    startScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    completionScreen.style.display = 'none';

    // Populate Definitions and Terms
    populateDefinitions(selectedQuestions);
    populateTerms(selectedQuestions);

    // Update Score
    updateScore();

    // Adjust Layout Based on Number of Questions
    adjustLayout(selectedQuestions.length);
}

/**
 * Populate the definitions area with droppable tiles.
 * @param {Array} questions - Array of question objects.
 */
function populateDefinitions(questions) {
    definitionsArea.innerHTML = ""; // Clear existing definitions

    questions.forEach(q => {
        const defTile = createDefinitionTile(q);
        definitionsArea.appendChild(defTile);
    });
}

/**
 * Create a single definition tile element.
 * @param {Object} question - A question object containing id, word, and definition.
 * @returns {HTMLElement} - The created definition tile element.
 */
function createDefinitionTile(question) {
    const tile = document.createElement('div');
    tile.classList.add('definition-tile');
    tile.dataset.id = question.id;

    const defText = document.createElement('div');
    defText.classList.add('definition-text');
    defText.textContent = question.definition;

    tile.appendChild(defText);

    // Allow Drop
    tile.addEventListener('dragover', allowDrop);
    tile.addEventListener('drop', handleDrop);

    return tile;
}

/**
 * Populate the terms area with draggable term items.
 * @param {Array} questions - Array of question objects.
 */
function populateTerms(questions) {
    termsArea.innerHTML = ""; // Clear existing terms
    const shuffledQuestions = shuffleArray([...questions]);

    shuffledQuestions.forEach(q => {
        const termItem = createTermItem(q);
        termsArea.appendChild(termItem);
    });
}

/**
 * Create a single draggable term item.
 * @param {Object} question - A question object containing id, word, and definition.
 * @returns {HTMLElement} - The created term item element.
 */
function createTermItem(question) {
    const term = document.createElement('div');
    term.classList.add('term-item');
    term.draggable = true;
    term.textContent = question.word;
    term.dataset.id = question.id;

    // Drag Events
    term.addEventListener('dragstart', dragStart);
    term.addEventListener('dragend', dragEnd);

    return term;
}

/**
 * Handle the dragover event to allow dropping.
 * @param {Event} event - The dragover event.
 */
function allowDrop(event) {
    event.preventDefault();
}

/**
 * Handle the drop event to match terms to definitions.
 * @param {Event} event - The drop event.
 */
function handleDrop(event) {
    event.preventDefault();
    const tile = event.currentTarget;
    const draggedId = event.dataTransfer.getData("text/plain");
    const draggedElement = document.querySelector(`.term-item[data-id='${draggedId}']`);

    if (!draggedElement) {
        console.warn("Dragged element not found.");
        return;
    }

    if (tile.classList.contains("matched")) {
        return;
    }

    const targetId = tile.dataset.id;

    if (draggedId === targetId) {
        // Correct Match
        score += 1;
        updateScore();
        // Remove the term from the terms area
        draggedElement.classList.add("correct");
        draggedElement.style.opacity = "0";
        setTimeout(() => {
            draggedElement.remove();
        }, 500); // Remove after fade-out

        // Mark the definition as matched
        tile.classList.add("correct", "matched");
        tile.innerHTML = `<strong>${draggedElement.textContent}:</strong> ${tile.querySelector('.definition-text').textContent}`;

        totalMatches--;

        // Check for Game Completion
        if (totalMatches === 0) {
            setTimeout(showCompletionScreen, 500);
        }
    } else {
        // Incorrect Match
        attempts[targetId]++;
        if (attempts[targetId] >= 3) {
            // Reveal the correct answer
            tile.classList.add("incorrect", "matched");
            // Find the correct term element
            const correctTerm = document.querySelector(`.term-item[data-id='${targetId}']`);
            if (correctTerm) {
                tile.innerHTML = `<strong>${correctTerm.textContent}:</strong> ${tile.querySelector('.definition-text').textContent}`;
                // Remove the correct term from terms area
                correctTerm.classList.add("correct");
                correctTerm.style.opacity = "0";
                setTimeout(() => {
                    correctTerm.remove();
                }, 500);
            }
            totalMatches--;
            // Check for Game Completion
            if (totalMatches === 0) {
                setTimeout(showCompletionScreen, 500);
            }
        } else {
            // Provide visual feedback for incorrect match
            tile.classList.add("incorrect");
            draggedElement.classList.add("incorrect");
            setTimeout(() => {
                tile.classList.remove("incorrect");
                draggedElement.classList.remove("incorrect");
            }, 1000);
        }
    }
}

/**
 * Handle the dragstart event.
 * @param {Event} event - The dragstart event.
 */
function dragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.dataset.id);
    setTimeout(() => {
        event.target.style.opacity = "0.5";
    }, 0);
}

/**
 * Handle the dragend event.
 * @param {Event} event - The dragend event.
 */
function dragEnd(event) {
    event.target.style.opacity = "1";
}

/**
 * Update the score display.
 */
function updateScore() {
    scoreSpan.textContent = score;
}

/**
 * Adjust the layout and font sizes based on the number of questions.
 * @param {number} numQuestions - The total number of questions.
 */
function adjustLayout(numQuestions) {
    const definitions = document.querySelectorAll(".definition-tile");
    const fontSize = numQuestions <= 15 ? "16px" : "14px";
    definitions.forEach(tile => {
        tile.querySelector(".definition-text").style.fontSize = fontSize;
    });

    const terms = document.querySelectorAll(".term-item");
    const termFontSize = numQuestions <= 15 ? "16px" : "14px";
    terms.forEach(term => {
        term.style.fontSize = termFontSize;
    });
}

/**
 * Shuffle an array using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} - The shuffled array.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Show the completion screen with the final score and percentage.
 */
function showCompletionScreen() {
    gameScreen.style.display = 'none';
    completionScreen.style.display = 'flex';

    // Calculate percentage
    const maxScore = selectedQuestions.length;
    const percentage = ((score / maxScore) * 100).toFixed(2);
    percentageScoreSpan.textContent = percentage;

    // Set completion message
    if (percentage >= 70) {
        completionMessage.textContent = "Good job!";
    } else {
        completionMessage.textContent = "Try again!";
    }
}

/**
 * Retry the current game with the same set of questions.
 */
function retryGame() {
    completionScreen.style.display = 'none';
    initializeGame();
}

/**
 * Return to the home screen from the completion screen.
 */
function backToHome() {
    completionScreen.style.display = 'none';
    gameScreen.style.display = 'none';
    startScreen.style.display = 'block';
}
