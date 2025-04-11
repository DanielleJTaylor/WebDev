let originalPosts = [];
let filteredPosts = [];
let loadedCount = 0;
const container = document.getElementById("card-container");


document.addEventListener("DOMContentLoaded", () => {
  fetch("posts.json")
    .then(res => res.json())
    .then(data => {
      originalPosts = data;
      allPosts = [...originalPosts]; // clone to avoid mutation
      loadNextBatch();
    });

  window.addEventListener("scroll", handleScroll);
});




function loadNextBatch() {
  const cardWidth = 200 + 10; // card width + gap (adjust if needed)
  const containerWidth = container.offsetWidth;
  const cardsPerRow = Math.floor(containerWidth / cardWidth);

  const dynamicBatchSize = cardsPerRow * 3;

  const nextBatch = allPosts.slice(loadedCount, loadedCount + dynamicBatchSize);

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

  loadedCount += dynamicBatchSize;

  // Load more if container still doesn't fill viewport
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
let excludeTags = [];

setupTagInput("include", includeTags);
setupTagInput("exclude", excludeTags);

function setupTagInput(type, tagArray) {
  const container = document.getElementById(`${type}-tags`);
  const input = document.getElementById(`${type}-input`);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      const tag = input.value.trim().toLowerCase();
      if (tag && !tagArray.includes(tag)) {
        tagArray.push(tag);
        addTagElement(container, input, tag, tagArray);
        input.value = "";
        input.placeholder = "";
      }
    }
  });
}

function addTagElement(container, input, tag, tagArray) {
  const pill = document.createElement("span");
  pill.className = "tag-pill";
  pill.innerHTML = `${tag}<span class="remove-tag">&times;</span>`;

  pill.querySelector(".remove-tag").addEventListener("click", () => {
    tagArray.splice(tagArray.indexOf(tag), 1);
    pill.remove();
    if (tagArray.length === 0) input.placeholder = "Type and press Enter";
  });

  container.insertBefore(pill, input);
  input.focus();
}

function stringSimilarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();

  // Require at least one word to start with the other (basic prefix match)
  if (a.startsWith(b) || b.startsWith(a)) return true;

  // Require at least 80% of characters in common
  const common = [...a].filter(char => b.includes(char)).length;
  return (common / Math.max(a.length, b.length)) > 0.8;
}



function applyFilters() {
  const includeInput = document.getElementById("include-input");
  const excludeInput = document.getElementById("exclude-input");

  const remainingInclude = includeInput.value.trim().toLowerCase();
  const remainingExclude = excludeInput.value.trim().toLowerCase();

  if (remainingInclude && !includeTags.includes(remainingInclude)) {
    includeTags.push(remainingInclude);
    addTagElement(document.getElementById("include-tags"), includeInput, remainingInclude, includeTags);
    includeInput.value = "";
  }

  if (remainingExclude && !excludeTags.includes(remainingExclude)) {
    excludeTags.push(remainingExclude);
    addTagElement(document.getElementById("exclude-tags"), excludeInput, remainingExclude, excludeTags);
    excludeInput.value = "";
  }

  container.innerHTML = "";

  // Filter from originalPosts
  filteredPosts = originalPosts.filter(post => {
    const postTags = post.tags.map(t => t.toLowerCase());

    const matchesInclude = includeTags.every(tag =>
      postTags.some(pt => stringSimilarity(tag, pt))
    );

    const matchesExclude = excludeTags.some(tag =>
      postTags.some(pt => stringSimilarity(tag, pt))
    );

    return matchesInclude && !matchesExclude;
  });

  loadedCount = 0;
  loadFilteredBatch(); // ✅ Use a new function to load from filteredPosts
}


function loadFilteredBatch() {
  const cardWidth = 200 + 10;
  const containerWidth = container.offsetWidth;
  const cardsPerRow = Math.floor(containerWidth / cardWidth);

  const dynamicBatchSize = cardsPerRow * 3;

  const nextBatch = filteredPosts.slice(loadedCount, loadedCount + dynamicBatchSize);

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

  loadedCount += dynamicBatchSize;

  if (document.documentElement.scrollHeight <= window.innerHeight && loadedCount < filteredPosts.length) {
    loadFilteredBatch();
  }
}
