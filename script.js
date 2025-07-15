/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Conversation history array
const messages = [];

/**
 * Helper function to convert simple markdown (**bold**, *italic*) to HTML.
 * Only handles **bold** and *italic* using <strong> and <em>.
 * Escapes HTML to prevent injection.
 * Emojis are preserved by default in JS and HTML, so no special handling is needed.
 */
function markdownToHtml(text) {
  // Escape HTML special characters, but preserve emoji characters
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Convert **bold** (must be before *italic*)
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Convert *italic*
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Emojis are Unicode and will render as-is in HTML

  return safe;
}

// Function to create a chat bubble
function addMessageBubble(role, text) {
  // Create bubble container
  const bubbleContainer = document.createElement("div");
  bubbleContainer.classList.add("bubble-container", role);

  // If assistant, add avatar
  if (role === "assistant") {
    const avatar = document.createElement("img");
    avatar.className = "assistant-avatar";
    avatar.src = "img/josephine-avatar.png"; // <-- This is the profile photo placeholder for Joséphine
    avatar.alt = "Joséphine avatar";
    avatar.width = 40;
    avatar.height = 40;
    bubbleContainer.appendChild(avatar);
  }

  // Create bubble element
  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", role);

  // Render markdown as HTML
  bubble.innerHTML = markdownToHtml(text);

  // Add simple fade-in animation
  bubble.style.opacity = 0;
  bubbleContainer.appendChild(bubble);
  chatWindow.appendChild(bubbleContainer);
  setTimeout(() => {
    bubble.style.opacity = 1;
  }, 50);

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Function to render all messages
function renderMessages() {
  chatWindow.innerHTML = "";
  // Hide the very first user message ("what is your name?")
  messages.forEach((msg, idx) => {
    // If it's the first message and it's a user message, skip rendering it
    if (
      idx === 0 &&
      msg.role === "user" &&
      msg.content === "what is your name?"
    ) {
      return;
    }
    addMessageBubble(msg.role, msg.content);
  });
}

// Initial render
renderMessages();

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user input
  const question = userInput.value.trim();
  if (!question) return;

  // Add user's message to history and UI
  messages.push({ role: "user", content: question });
  renderMessages();

  // Show typing indicator
  const typingBubble = document.createElement("div");
  typingBubble.classList.add("chat-bubble", "assistant", "typing");
  typingBubble.textContent = "Joséphine is thinking...";
  chatWindow.appendChild(typingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Prepare history array for payload (excluding system prompt)
  const history = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  let reply = "";
  let josephineFailed = false;
  try {
    // Send POST request to Cloudflare Worker with history
    const res = await fetch(
      "https://loralchatbot-worker-gca.bennett-j1804.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      }
    );
    if (!res.ok) throw new Error("Joséphine endpoint failed");
    const data = await res.json();
    // ✅ Extract reply from .reply (matches Worker response)
    reply = data.reply || "";
    if (!reply) throw new Error("No response from Joséphine");
  } catch (err) {
    josephineFailed = true;
    // Fallback: try OpenAI API with same history and a system prompt
    try {
      // Insert a system prompt at the start
      const openaiHistory = [
        {
          role: "system",
          content:
            "You are a helpful assistant for L'Oréal. Answer user questions helpfully and concisely.",
        },
        ...history,
      ];
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Insert your OpenAI API key here, or handle securely in production
          Authorization: "Bearer YOUR_OPENAI_API_KEY",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: openaiHistory,
          max_tokens: 512,
        }),
      });
      if (!res.ok) throw new Error("OpenAI fallback failed");
      const data = await res.json();
      reply =
        (data.choices && data.choices[0]?.message?.content) ||
        "Sorry, I’m having trouble connecting right now. Please try again later.";
    } catch (err2) {
      reply =
        "Sorry, I’m having trouble connecting right now. Please try again later.";
    }
  }

  // Remove typing indicator
  typingBubble.remove();

  // Add assistant's response to history and UI
  messages.push({ role: "assistant", content: reply });
  renderMessages();

  // Clear input field
  userInput.value = "";
});

// Optional: Send on Enter key in input field
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

// On page load, ask "what is your name?" (hidden from user) and display only Joséphine's response
window.addEventListener("DOMContentLoaded", async () => {
  // Add the hidden user message to the conversation history
  messages.push({ role: "user", content: "what is your name?" });

  // Show typing indicator
  const typingBubble = document.createElement("div");
  typingBubble.classList.add("chat-bubble", "assistant", "typing");
  typingBubble.textContent = "Joséphine is thinking...";
  chatWindow.appendChild(typingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Prepare history array for payload
  const history = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  let reply = "";
  try {
    // Send POST request to Cloudflare Worker with history
    const res = await fetch(
      "https://loralchatbot-worker-gca.bennett-j1804.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      }
    );
    if (!res.ok) throw new Error("Joséphine endpoint failed");
    const data = await res.json();
    reply = data.reply || "";
    if (!reply) throw new Error("No response from Joséphine");
  } catch (err) {
    reply =
      "Sorry, I’m having trouble connecting right now. Please try again later.";
  }

  // Remove typing indicator
  typingBubble.remove();

  // Add only Joséphine's response to the chat
  messages.push({ role: "assistant", content: reply });
  renderMessages();
});
