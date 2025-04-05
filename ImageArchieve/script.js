let allPosts = [];
let loadedCount = 0;
const batchSize = 12;
const container = document.getElementById("card-container");

document.addEventListener("DOMContentLoaded", () => {
  fetch("posts.json")
    .then(res => res.json())
    .then(data => {
      allPosts = data;
      loadNextBatch();
    });

  window.addEventListener("scroll", handleScroll);
});



function loadNextBatch() {
  const nextBatch = allPosts.slice(loadedCount, loadedCount + batchSize);

  nextBatch.forEach(post => {
    const card = document.createElement("div");
    card.className = "card";

    const tags = post.tags.map(tag => `<span class="tag">${tag}</span>`).join(" ");

    card.innerHTML = `
      <img src="${post.image}" alt="${post.title}" loading="lazy">
      <div class="overlay">
        <div class="top">
          <h3>${post.title}</h3>
          <p class="author">${post.author}</p>
        </div>
        <div class="bottom">
          ${tags}
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  loadedCount += batchSize;

  // 👇 If we still can't scroll, load more right away
  if (document.documentElement.scrollHeight <= window.innerHeight && loadedCount < allPosts.length) {
    loadNextBatch();
  }
}




function handleScroll() {
  console.log("scrolling...");

  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;

  if (scrollY + windowHeight >= docHeight - 100) {
    if (loadedCount < allPosts.length) {
      console.log("Loading more cards...");
      loadNextBatch();
    }
  }
}





let includeTags = [];

const tagContainer = document.getElementById("include-tags");
const tagInput = document.getElementById("include-input");

tagInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" || e.key === "," || e.key === " ") {
    e.preventDefault();
    const tag = tagInput.value.trim().toLowerCase();
    if (tag && !includeTags.includes(tag)) {
      includeTags.push(tag);
      addTagElement(tag);
      tagInput.value = "";
    }
  }
});

function addTagElement(tag) {
  const pill = document.createElement("span");
  pill.className = "tag-pill";
  pill.innerHTML = `${tag}<span class="remove-tag">&times;</span>`;

  pill.querySelector(".remove-tag").addEventListener("click", () => {
    includeTags = includeTags.filter(t => t !== tag);
    pill.remove();

    // Restore placeholder if no tags left
    if (includeTags.length === 0) {
      tagInput.placeholder = "Type and press Enter";
    }
  });

  tagContainer.insertBefore(pill, tagInput);

  // Remove placeholder after first tag
  tagInput.placeholder = "";
}


// Optional: expose `includeTags` when filtering
function applyFilters() {
  console.log("Include Tags:", includeTags);
  // ...use includeTags in your filter logic
}
