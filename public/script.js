document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab");
    const contents = document.querySelectorAll(".content");

    function activateTab(tabName) {
        tabs.forEach(t => t.classList.remove("active"));
        contents.forEach(content => content.classList.remove("active"));

        document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add("active");
        document.getElementById(tabName)?.classList.add("active");
    }

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            const tabName = this.getAttribute("data-tab");
            activateTab(tabName);
            window.location.hash = tabName;  // Update URL hash
        });
    });

    // Activate tab from URL hash if available
    const hash = window.location.hash.substring(1); // Remove the #
    if (hash) {
        activateTab(hash);
    } else {
        activateTab('for-you'); // Set your default tab here (matching data-tab value)
    }
});


document.addEventListener("DOMContentLoaded", function () {
    const menuButton = document.getElementById("menuButton");
    const sidebar = document.getElementById("sidebar");
    const aboutButton = document.getElementById("aboutButton");
    const aboutSection = document.getElementById("aboutSection");
    const aboutBackButton = document.getElementById("aboutBackButton");

    // Toggle Sidebar
    menuButton.addEventListener("click", function (event) {
        event.stopPropagation(); // Prevent immediate close
        sidebar.classList.remove("hidden");
    });

    // Close Sidebar when clicking outside of it
    document.addEventListener("click", function (event) {
        if (!sidebar.contains(event.target) && !menuButton.contains(event.target)) {
            sidebar.classList.add("hidden");
        }
    });

    // Prevent Sidebar from closing when clicking inside it
    sidebar.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    // Close Sidebar when clicking an option inside it
    function closeSidebar() {
        sidebar.classList.add("hidden");
    }

    aboutButton.addEventListener("click", function () {
        closeSidebar(); // Hide sidebar
        aboutSection.classList.remove("hidden"); // Show About section
    });

    aboutBackButton.addEventListener("click", function () {
        aboutSection.classList.add("hidden"); // Hide About section
    });

    // Close sidebar when clicking on "Admin Login" link
    document.querySelector("h2[onclick]").addEventListener("click", closeSidebar);
});

document.addEventListener('DOMContentLoaded', () => {
    // Toggle create post form
    document.getElementById('createPostButton').addEventListener('click', () => {
        document.getElementById('createPost').classList.toggle('hidden');
    });

    document.getElementById('createPostBackButton').addEventListener('click', () => {
        document.getElementById('createPost').classList.add('hidden');
    });

    // Add image upload functionality
document.getElementById('imageUploadButton').addEventListener('click', () => {
    document.getElementById('imageInput').click();
});

let selectedImage = null;

document.getElementById('imageInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/api/upload/post', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (response.ok) {
            selectedImage = result.imageUrl;
            document.getElementById('imagePreview').innerHTML = `
                <div class="relative mt-2" style="padding-top: 56.25%">
                    <img src="${result.imageUrl}" 
                         class="absolute top-0 left-0 w-full h-full object-cover rounded-lg"
                         alt="Preview"/>
                </div>
            `;
        }
    } catch (error) {
        console.error('Image upload failed:', error);
        alert('Image upload failed');
    }
});

    // Submit post
    document.getElementById("submitPostButton").addEventListener("click", async () => {
        const postContent = document.getElementById("postContent").value.trim();
        
        if (!postContent && !selectedImage) {
            alert("Post must contain text or image!");
            return;
        }
    
        try {
            const response = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    content: postContent,
                    imageUrl: selectedImage 
                })
            });
    
            if (response.ok) {
                window.location.reload();
            } else {
                alert("Error creating post");
            }
        } catch (error) {
            console.error("Post submission error:", error);
            alert("Failed to submit post");
        }
    });

    // Fetch and display posts
    fetchPosts();
});

async function fetchPosts() {
    try {
        const response = await fetch('/api/posts');
        if (!response.ok) throw new Error('Failed to fetch posts');
        const posts = await response.json();
        const postsContainer = document.getElementById('postsContainer');
        window.location.hash = "explore";

        // Update the post template in fetchPosts()
        postsContainer.innerHTML = posts.map(post => `
            <div class="bg-gray-200 p-3 rounded-2xl  shadow-lg  mb-4">
                <div class="flex items-center mb-4">
                    <h1 class="font-karla text-gray-800">UniSphere</h1>
                </div>
                ${post.content ? `<p class="text-gray-700 leading-relaxed mb-4">${post.content}</p>` : ''}
                ${post.imageUrl ? `
                    <div class="relative overflow-hidden rounded-lg" style="padding-top: 56.25%">
                        <img src="${post.imageUrl}" 
                             class="absolute top-0 left-0 w-full h-full object-cover cursor-pointer" 
                             onclick="window.open('${post.imageUrl}', '_blank')"
                             alt="Post image"/>
                    </div>
                ` : ''}
                <div class="flex items-center gap-2 mt-4">
                <button class="like-btn flex items-center group" data-post-id="${post._id}" data-liked="${post.liked}">
    <svg class="w-6 h-6 ${post.liked ? 'text-red-500' : 'text-gray-600'}" 
         fill="${post.liked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z">
        </path>
    </svg>
    <span class="like-count ml-1 text-gray-600">${post.likes || 0}</span>
</button>

            
                    <button class="flex items-center text-gray-600 hover:text-blue-500 ml-2" 
                            onclick="toggleCommentSection('${post._id}')">
                            <svg class="w-6 h-6" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24" 
                            xmlns="http://www.w3.org/2000/svg">
                           <path stroke-linecap="round" 
                                 stroke-linejoin="round" 
                                 stroke-width="2" 
                                 d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z">
                           </path>
                       </svg>
                       
                        <span class="comment-count ml-1 text-gray-600">${post.comments?.length || 0}</span>
                    </button>
                </div>
                <div id="commentSection-${post._id}" class="hidden">
                    <input type="text" id="commentInput-${post._id}" 
                           placeholder="Write a comment..." 
                           class="border p-2 rounded w-full mt-2"/>
                    <button onclick="submitComment('${post._id}')" 
                            class="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
                        Submit
                    </button>
                    <div id="commentsContainer-${post._id}" class="mt-2 text-left"></div>
                </div>
            </div>
        `).join('');

        // Add event listeners to like buttons
        document.querySelectorAll('.like-btn').forEach(button => {
            button.addEventListener('click', handleLike);
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        alert('Failed to load posts. Please try again later.');
    }
}
// Toggle the 3-dot menu
function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Close menu when clicking outside
document.addEventListener("click", function(event) {
    document.querySelectorAll(".menu-dropdown").forEach(menu => {
        if (!menu.parentElement.contains(event.target)) {
            menu.style.display = "none";
        }
    });
});


async function handleLike(event) {
    const button = event.currentTarget;
    const postId = button.getAttribute("data-post-id");
    const liked = button.getAttribute("data-liked") === "true";
    const likeCountElement = button.querySelector(".like-count");
    const heartIcon = button.querySelector("svg");

    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ liked: !liked })
        });

        if (!response.ok) throw new Error("Failed to update like");

        // Update the UI
        const updatedLikes = liked ? parseInt(likeCountElement.innerText) - 1 : parseInt(likeCountElement.innerText) + 1;
        likeCountElement.innerText = updatedLikes;
        button.setAttribute("data-liked", !liked);

        // Toggle classes and fill color
        heartIcon.classList.toggle("text-red-500", !liked);
        heartIcon.classList.toggle("text-gray-600", liked);
        heartIcon.setAttribute("fill", !liked ? "currentColor" : "none");

    } catch (error) {
        console.error("Like toggle error:", error);
    }
}

function toggleCommentSection(postId) {
    const section = document.getElementById(`commentSection-${postId}`);
    section.classList.toggle('hidden');
    
    if (!section.classList.contains('hidden')) {
        fetchComments(postId);  // Make sure this is called only when opening
    }
}


async function submitComment(postId) {
    const commentInput = document.getElementById(`commentInput-${postId}`);
    const comment = commentInput.value.trim();
    
    if (!comment) {
        alert('Comment cannot be empty!');
        return;
    }

    console.log("Submitting comment:", comment); // Debug log

    try {
        const response = await fetch(`/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: comment })  
        });

        const result = await response.json();
        console.log("Server response:", result); // Debug log

        if (!response.ok) throw new Error(result.message || 'Failed to add comment');

        // Add new comment at the top
        const commentsContainer = document.getElementById(`commentsContainer-${postId}`);
        const newCommentElement = document.createElement("p");
        newCommentElement.classList.add("text-gray-600", "mt-2");
        newCommentElement.innerHTML = `<i class="fa-regular fa-comment"></i> ${comment}`;

        commentsContainer.prepend(newCommentElement); // Add to top instead of append

        commentInput.value = ''; // Clear input field
    } catch (error) {   
        console.error('Error submitting comment:', error);
    }
}


async function fetchComments(postId) {
    try {
        console.log(`Fetching comments for post: ${postId}`); // Debug log

        const response = await fetch(`/api/posts/${postId}/comments`);
        if (!response.ok) throw new Error('Failed to fetch comments');

        let comments = await response.json();
        console.log("Fetched comments:", comments); // Debug log

        const commentsContainer = document.getElementById(`commentsContainer-${postId}`);

        if (!commentsContainer) {
            console.error(`Comment container not found for post: ${postId}`);
            return;
        }

        commentsContainer.innerHTML = ""; // Clear old comments

        // Reverse the order so the latest comments appear first
        comments.reverse().forEach(comment => {
            const commentElement = document.createElement("p");
            commentElement.classList.add("text-gray-600", "mt-2");
            commentElement.innerHTML = `<i class="fa-regular fa-comment"></i> ${comment.content}`;
            commentsContainer.appendChild(commentElement);
        });

    } catch (error) {
        console.error('Error fetching comments:', error);
    }
}




document.addEventListener("DOMContentLoaded", async function () {
    let bgImage = document.getElementById("bgImage");

    try {
        const bgResponse = await fetch(`/api/background?ts=${Date.now()}`);
        if (!bgResponse.ok) throw new Error("Failed to fetch background image.");
        
        const bgData = await bgResponse.json();
        if (bgData.imageUrl) {
            bgImage.src = `${bgData.imageUrl}?ts=${Date.now()}`; // Set correct URL from database
            bgImage.style.display = "block";
        } else {
            console.warn("No background image found.");
        }
    } catch (error) {
        console.error("Error loading background image:", error.message);
    }
});

