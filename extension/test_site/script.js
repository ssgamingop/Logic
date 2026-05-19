const questions = [
  {
    question: "Which of the following is a key advantage of a Linked List over an Array?",
    options: [
      "Random access to elements is faster in a linked list",
      "Dynamic size, easing insertion and deletion",
      "Less memory usage per element",
      "Cache locality is generally better"
    ],
    answer: 1 // Option B
  },
  {
    question: "In a full binary tree, if the number of internal nodes is 'I', what is the total number of leaves?",
    options: [
      "I - 1",
      "I",
      "I + 1",
      "2 * I"
    ],
    answer: 2 // Option C
  },
  {
    question: "Which data structure uses LIFO (Last In First Out) principle?",
    options: [
      "Queue",
      "Stack",
      "Linked List",
      "Binary Search Tree"
    ],
    answer: 1 // Option B
  },
  {
    question: "What is the worst-case time complexity of searching an element in a generic Binary Search Tree (BST)?",
    options: [
      "O(1)",
      "O(log n)",
      "O(n)",
      "O(n log n)"
    ],
    answer: 2 // Option C
  },
  {
    question: "A graph traversal technique that uses a queue as an auxiliary data structure is:",
    options: [
      "Depth First Search",
      "Breadth First Search",
      "Dijkstra's Algorithm",
      "Prim's Algorithm"
    ],
    answer: 1 // Option B
  }
];

let currentQuestionIndex = 0;
let score = 0;
const userAnswers = [];

const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const progressText = document.getElementById("progress");
const nextBtn = document.getElementById("nextBtn");
const questionContainer = document.getElementById("questionContainer");

function loadQuestion() {
  const q = questions[currentQuestionIndex];
  
  progressText.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
  questionText.textContent = q.question;
  optionsContainer.innerHTML = "";
  
  q.options.forEach((opt, index) => {
    const optionDiv = document.createElement("div");
    optionDiv.className = "option";
    
    const radioInput = document.createElement("input");
    radioInput.type = "radio";
    radioInput.name = "quizOption";
    radioInput.id = `option${index}`;
    radioInput.value = index;
    
    const label = document.createElement("label");
    label.htmlFor = `option${index}`;
    label.textContent = opt;
    
    optionDiv.appendChild(radioInput);
    optionDiv.appendChild(label);
    
    // Add click event to div for better UX
    optionDiv.addEventListener("click", () => {
      radioInput.checked = true;
      
      // Update UI for selected
      document.querySelectorAll(".option").forEach(d => d.classList.remove("selected"));
      optionDiv.classList.add("selected");
      
      // Enable next button
      nextBtn.disabled = false;
    });
    
    optionsContainer.appendChild(optionDiv);
  });
  
  nextBtn.disabled = true;
}

nextBtn.addEventListener("click", () => {
  const selectedRadio = document.querySelector('input[name="quizOption"]:checked');
  if (selectedRadio) {
    const selectedVal = parseInt(selectedRadio.value);
    
    userAnswers.push({
      questionIndex: currentQuestionIndex,
      selectedOption: selectedVal
    });

    if (selectedVal === questions[currentQuestionIndex].answer) {
      score++;
    }
    
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      loadQuestion();
    } else {
      showResults();
    }
  }
});

function showResults() {
  progressText.textContent = "Finished!";
  
  let reviewHTML = `<div style="margin-top: 20px; text-align: left;">`;
  reviewHTML += `<h3 style="margin-bottom: 12px; color: #4f46e5;">Review:</h3>`;
  
  questions.forEach((q, i) => {
    const userAns = userAnswers[i].selectedOption;
    const isCorrect = userAns === q.answer;
    
    if (!isCorrect) {
      reviewHTML += `
        <div style="background: #fee2e2; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #fca5a5;">
          <p style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">Q${i + 1}: ${q.question}</p>
          <p style="font-size: 0.85rem; color: #b91c1c; margin-bottom: 4px;">❌ Your Answer: ${q.options[userAns]}</p>
          <p style="font-size: 0.85rem; color: #047857;">✅ Correct Answer: ${q.options[q.answer]}</p>
        </div>
      `;
    }
  });
  
  if (score === questions.length) {
    reviewHTML += `<p style="color: #047857; font-weight: 600; text-align: center;">Perfect! You got everything right.</p>`;
  }
  
  reviewHTML += `</div>`;

  questionContainer.innerHTML = `
    <div class="result-container">
      <h2>Quiz Completed!</h2>
      <p style="font-size: 1.2rem; margin-bottom: 10px;">Your Score: <strong>${score}</strong> out of <strong>${questions.length}</strong></p>
      ${reviewHTML}
    </div>
  `;
  nextBtn.style.display = "none";
}

// Initialize quiz
loadQuestion();
