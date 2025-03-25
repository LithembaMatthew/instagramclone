class App {
  constructor() {
    this.storage = firebase.storage();
    this.firestore = firebase.firestore();
    this.$fileInput = document.querySelector("#upload-file");
    this.$caption = document.querySelector("#create-caption");
    this.$uploadFileButton = document.querySelector("#upload-button");
    this.$app = document.querySelector("#app");
    this.$firebaseAuthContainer = document.querySelector(
      "#firebaseui-auth-container"
    );
    this.$authUser = document.querySelector(".auth-user");
    this.$uploadButton = document.querySelector("#create");
    this.$uploadPage = document.querySelector("#upload-page");
    this.$uploadPage.style.display = "none";
    this.$postForm = document.querySelector(".post-form");
    this.$closeModalBtn = document.querySelector(".close-modal-btn");
    this.$profileBtn = document.querySelector(".profile-btn");
    this.$profileContent = document.querySelector(".profile-content");
    this.$Content = document.querySelector(".content");
    this.$homeBtn = document.querySelector(".Home-btn");
    this.$optionsBtn = document.querySelectorAll(".optionsModal-btn");
    this.$moreOptionsModal = document.querySelector(".more-options-modal");
    this.$moreOptionsContainer = document.querySelector(
      ".more-options-container"
    );
    this.$editBtn = document.querySelector(".editBtn");
    this.$deleteBtn = document.querySelector(".deleteBtn");
    this.$staticModal = document.querySelector(".static-modal");
    this.$dynamicModal = document.querySelector(".dynamic-modal");

    this.ui = new firebaseui.auth.AuthUI(firebase.auth());
    this.handleAuth();

    this.$authUser.addEventListener("click", (event) => {
      this.handleLogout();
    });

    this.$uploadButton.addEventListener("click", (event) => {
      this.handleUpload();
    });

    this.saveToStorage();

    this.$uploadPage.addEventListener(
      "click",
      this.CloseCreateModal.bind(this)
    );
    this.$closeModalBtn.addEventListener(
      "click",
      this.CloseCreateModal.bind(this)
    );

    this.$postForm.addEventListener("click", (event) => {
      event.stopPropagation();
      this.CloseCreateModal();
    });

    this.$profileBtn.addEventListener("click", (e) => {
      this.toggleContent();
    });

    this.$homeBtn.addEventListener("click", (e) => {
      this.ReturnHome();
    });

    this.$editBtn.addEventListener("click", (event) => {
      this.EditPost();
    });

    this.$deleteBtn.addEventListener("click", () => {
      this.deletePost();
    });

    this.$moreOptionsModal.addEventListener("click", (event) => {
      this.CloseOptionsModal(event);
    });

    this.currentPostId = null;
    document.addEventListener("click", (event) => {
      const postElement = event.target.closest(".post");
      if (postElement) {
        this.currentPostId = postElement.dataset.postId;
        console.log("Found post ID:", this.currentPostId);
      } else {
        console.log("No .post element found.");
      }
    });
  }

 saveToStorage() {
  this.$uploadFileButton.addEventListener("click", (event) => {
    event.preventDefault();

    const file = this.$fileInput.files[0];
    const captionValue = this.$caption.value;
    const statusElement = document.querySelector("#statusMessage");

    const user = firebase.auth().currentUser;
    if (!user) return console.error("No user is signed in.");

    const displayName = user.displayName;

    if (this.currentPostId) {
      // Handle edit functionality
      const postRef = this.firestore.collection("images").doc(this.currentPostId);
      let updateData = {};

      if (file) {
        const storageRef = this.storage.ref("images/" + file.name);
        const uploadTask = storageRef.put(file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            statusElement.innerHTML = `Upload in progress: ${Math.round(progress)}%`;
          },
          (error) => {
            console.error("Error during upload:", error);
            statusElement.innerHTML = "Upload Unsuccessful";
            statusElement.style.color = "red";
          },
          () => {
            storageRef.getDownloadURL().then((url) => {
              updateData.url = url;
              this.finalizeSaveOrEdit(postRef, updateData, captionValue, statusElement);
              statusElement.innerHTML = "Upload Successful";
              statusElement.style.color = "green";
            });
          }
        );
      } else {
        this.finalizeSaveOrEdit(postRef, updateData, captionValue, statusElement);
      }
    } else {
      // Handle new post upload
      if (!file) return console.error("No file selected.");

      const storageRef = this.storage.ref("images/" + file.name);
      const uploadTask = storageRef.put(file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          statusElement.innerHTML = `Upload in progress: ${Math.round(progress)}%`;
        },
        (error) => {
          console.error("Error during upload:", error);
          statusElement.innerHTML = "Upload Unsuccessful";
          statusElement.style.color = "red";
        },
        () => {
          storageRef.getDownloadURL().then((url) => {
            const imageData = {
              userId: user.uid,
              displayName: displayName,
              caption: captionValue,
              url: url,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            };

            this.firestore
              .collection("images")
              .add(imageData)
              .then(() => {
                statusElement.innerHTML = "Upload Successful";
                statusElement.style.color = "green";
                this.$fileInput.value = "";
                this.$caption.value = "";
                setTimeout(() => location.reload(), 2000);
              })
              .catch((error) => {
                console.error("Error storing data:", error);
                statusElement.innerHTML = "Upload Unsuccessful";
                statusElement.style.color = "red";
              });
          });
        }
      );
    }
  });
}


  finalizeSaveOrEdit(postRef, updateData, newCaptionValue, statusElement) {
    if (newCaptionValue) {
      updateData.caption = newCaptionValue;
    }

    if (Object.keys(updateData).length > 0) {
      postRef
        .update(updateData)
        .then(() => {
          statusElement.innerHTML = "Edit Successful";
          statusElement.style.color = "green";
          setTimeout(() => location.reload(), 2000);
        })
        .catch((error) => {
          console.error("Error updating data:", error);
          statusElement.innerHTML = "Edit Unsuccessful";
          statusElement.style.color = "red";
        });
    } else {
      console.log("No changes to update.");
    }
  }

  readFromStorage() {
    const dynamicContentDiv = document.querySelectorAll(".dynamic-content");

    const user = firebase.auth().currentUser;
    if (!user) {
      console.error("No user is signed in.");
      return;
    }

    this.firestore
      .collection("images")
      .where("userId", "==", user.uid)
      .get()
      .then((querySnapshot) => {
        dynamicContentDiv.innerHTML = "";

        querySnapshot.forEach((doc) => {
          const post = doc.data();
          const postId = doc.id;
          const postDiv = document.createElement("div");
          postDiv.classList.add("post");
          postDiv.dataset.postId = postId;
          console.log(postId);
          document.querySelector(".username").textContent = post.displayName
            .toLowerCase()
            .replace(/\s+/g, "");
          document.querySelector(".name").textContent = post.displayName;

          postDiv.innerHTML = `
  <div class="post" data-post-id="${postId}">
    <div class="header">
      <div class="profile-area">
        <div class="post-pic">
          <img
            alt="${post.displayName}'s profile picture"
            class="_6q-tv"
            data-testid="user-avatar"
            draggable="false"
            src="assets/akhil.png"
          />
        </div>
        <span class="profile-name">${post.displayName}</span>
      </div>
      <div class="options optionsModal-btn">
        <div class="Igw0E rBNOH YBx95 _4EzTm" style="height: 24px; width: 24px">
          <svg aria-label="More options" class="_8-yf5" fill="#262626" height="16" viewBox="0 0 48 48" width="16">
            <circle clip-rule="evenodd" cx="8" cy="24" fill-rule="evenodd" r="4.5"></circle>
            <circle clip-rule="evenodd" cx="24" cy="24" fill-rule="evenodd" r="4.5"></circle>
            <circle clip-rule="evenodd" cx="40" cy="24" fill-rule="evenodd" r="4.5"></circle>
          </svg>
        </div>
      </div>
    </div>
    <div class="body">
      <img
        alt="Photo by ${post.displayName}"
        class="FFVAD"
        decoding="auto"
        sizes="614px"
        src="${post.url}"
        style="object-fit: cover"
      />
    </div>
    <div class="footer">
      <div class="user-actions">
        <div class="like-comment-share">
          <div>
            <span>
              <svg aria-label="Like" class="_8-yf5" fill="#262626" height="24" viewBox="0 0 48 48" width="24">
               <path
                                d="M34.6 6.1c5.7 0 10.4 5.2 10.4 11.5 0 6.8-5.9 11-11.5 16S25 41.3 24 41.9c-1.1-.7-4.7-4-9.5-8.3-5.7-5-11.5-9.2-11.5-16C3 11.3 7.7 6.1 13.4 6.1c4.2 0 6.5 2 8.1 4.3 1.9 2.6 2.2 3.9 2.5 3.9.3 0 .6-1.3 2.5-3.9 1.6-2.3 3.9-4.3 8.1-4.3m0-3c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5.6 0 1.1-.2 1.6-.5 1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"
                              ></path>
              </svg>
            </span>
          </div>
          <div class="margin-left-small">
            <svg aria-label="Comment" class="_8-yf5" fill="#262626" height="24" viewBox="0 0 48 48" width="24">
             <path
                              clip-rule="evenodd"
                              d="M47.5 46.1l-2.8-11c1.8-3.3 2.8-7.1 2.8-11.1C47.5 11 37 .5 24 .5S.5 11 .5 24 11 47.5 24 47.5c4 0 7.8-1 11.1-2.8l11 2.8c.8.2 1.6-.6 1.4-1.4zm-3-22.1c0 4-1 7-2.6 10-.2.4-.3.9-.2 1.4l2.1 8.4-8.3-2.1c-.5-.1-1-.1-1.4.2-1.8 1-5.2 2.6-10 2.6-11.4 0-20.6-9.2-20.6-20.5S12.7 3.5 24 3.5 44.5 12.7 44.5 24z"
                              fill-rule="evenodd"
                            ></path>
            </svg>
          </div>
          <div class="margin-left-small">
            <svg aria-label="Share Post" class="_8-yf5" fill="#262626" height="24" viewBox="0 0 48 48" width="24">
<path
                              d="M47.8 3.8c-.3-.5-.8-.8-1.3-.8h-45C.9 3.1.3 3.5.1 4S0 5.2.4 5.7l15.9 15.6 5.5 22.6c.1.6.6 1 1.2 1.1h.2c.5 0 1-.3 1.3-.7l23.2-39c.4-.4.4-1 .1-1.5zM5.2 6.1h35.5L18 18.7 5.2 6.1zm18.7 33.6l-4.4-18.4L42.4 8.6 23.9 39.7z"
                            ></path>
            </svg>
          </div>
        </div>
        <div class="bookmark">
          <div class="QBdPU rrUvL">
            <svg aria-label="Save" class="_8-yf5" fill="#262626" height="24" viewBox="0 0 48 48" width="24">
              <path
                              d="M43.5 48c-.4 0-.8-.2-1.1-.4L24 29 5.6 47.6c-.4.4-1.1.6-1.6.3-.6-.2-1-.8-1-1.4v-45C3 .7 3.7 0 4.5 0h39c.8 0 1.5.7 1.5 1.5v45c0 .6-.4 1.2-.9 1.4-.2.1-.4.1-.6.1zM24 26c.8 0 1.6.3 2.2.9l15.8 16V3H6v39.9l15.8-16c.6-.6 1.4-.9 2.2-.9z"
                            ></path>
            </svg>
          </div>
        </div>
      </div>
      <span class="likes">
        Liked by <b>ishitaaaa.b</b> and <b>others</b>
      </span>
      <span class="caption">
        <span class="caption-username"><b>${post.displayName}</b></span>
        <span class="caption-text">${post.caption}</span>
      </span>
      <span class="posted-time">5 hours ago</span>
    </div>
    <div class="add-comment">
      <input type="text" placeholder="Add a comment..." />
      <a class="post-btn">Post</a>
    </div>
  </div>`;

          // Append the post div to the dynamic content area
          dynamicContentDiv.forEach((div) => {
            div.appendChild(postDiv.cloneNode(true));
          });
        });
      })
      .catch((error) => {
        console.error("Error fetching posts: ", error);
      });

    this.OpenOptionsModal();
  }

  handleUpload() {
    this.$firebaseAuthContainer.style.display = "none";
    this.$app.style.display = "block";
    this.$uploadPage.style.display = "block";
  }

  CloseCreateModal(event) {
    if (
      !this.$postForm.contains(event.target) ||
      this.$closeModalBtn.contains(event.target)
    ) {
      this.$firebaseAuthContainer.style.display = "none";
      this.$app.style.display = "block";
      this.$uploadPage.style.display = "none";
    }
    this.$fileInput.value = "";
    this.$caption.value = "";
  }

  OpenCreateModal() {
    this.$firebaseAuthContainer.style.display = "none";
    this.$app.style.display = "block";
    this.$uploadPage.style.display = "block";
  }

  CloseOptionsModal(event) {
    if (this.$moreOptionsModal.contains(event.target)) {
      this.$firebaseAuthContainer.style.display = "none";
      this.$app.style.display = "block";
      this.$uploadPage.style.display = "none";
      this.$moreOptionsModal.style.display = "none";
      console.log("Close modal is working");
    }
  }

  OpenOptionsModal() {
    document.addEventListener("click", (event) => {
      const post = event.target.closest(".post");
      if (!post) return;

      const postId = post.dataset.postId;

      if (postId === "static") {
        this.$firebaseAuthContainer.style.display = "none";
        this.$app.style.display = "block";
        this.$uploadPage.style.display = "none";
        this.$moreOptionsModal.style.display = "block";

        this.$moreOptionsContainer.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        this.$dynamicModal.style.display = "none";
        this.$staticModal.style.display = "flex";

        console.log(`You pressed on the static div with post ID: ${postId}`);
      } else {
        this.$firebaseAuthContainer.style.display = "none";
        this.$app.style.display = "block";
        this.$uploadPage.style.display = "none";
        this.$moreOptionsModal.style.display = "block";

        this.$moreOptionsContainer.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        this.$staticModal.style.display = "none";
        this.$dynamicModal.style.display = "block";

        console.log(`You pressed on the dynamic div with post ID: ${postId}`);
      }
    });
  }

  EditPost() {
    this.$uploadPage.style.display = "block";
    this.$moreOptionsModal.style.display = "none";
    // Retrieve the current post details (using the currentPostId)
    if (this.currentPostId) {
      this.firestore
        .collection("images")
        .doc(this.currentPostId)
        .get()
        .then((doc) => {
          if (doc.exists) {
            const postData = doc.data();

            this.$fileInput.value = "";
            this.$caption.value = postData.caption || "";

            const imagePreview = document.querySelector("#image-preview");
            if (imagePreview) {
              imagePreview.src = postData.url;
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching post data:", error);
        });
    }
  }

  async deletePost() {
    if (!this.currentPostId) {
      console.error("No post ID found to delete.");
      return;
    }

    try {
      const postElement = document.querySelector(
        `[data-post-id='${this.currentPostId}']`
      );
      if (postElement) {
        postElement.remove(); // Remove the element from the DOM immediately
        console.log("Post element removed from the DOM.");
      } else {
        console.warn("No DOM element found for post ID:", this.currentPostId);
      }

      const doc = await this.firestore
        .collection("images")
        .doc(this.currentPostId)
        .get();

      if (!doc.exists) {
        console.warn(
          "Post not found in Firestore with ID:",
          this.currentPostId
        );
        return;
      }

      const post = doc.data();
      console.log("Post data to delete:", post);

      await this.firestore
        .collection("images")
        .doc(this.currentPostId)
        .delete();
      console.log("Post document deleted successfully from Firestore");

      if (post.url) {
        const storageRef = firebase.storage().refFromURL(post.url);
        await storageRef.delete();
        console.log("Image deleted successfully from Firebase Storage.");
      } else {
        console.log("No image found for this post.");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
    location.reload();
  }

  handleAuth() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.$authUser.innerHTML = "Logout";
        this.redirectToApp();
        this.readFromStorage();
      } else {
        this.redirectToAuth();
      }
    });
  }

  handleLogout() {
    firebase
      .auth()
      .signOut()
      .then(() => {
        this.redirectToAuth();
      })
      .catch((error) => {
        console.log("ERROR OCCURRED", error);
      });
  }

  redirectToApp() {
    this.$firebaseAuthContainer.style.display = "none";
    this.$app.style.display = "block";
  }

  redirectToAuth() {
    this.$firebaseAuthContainer.style.display = "block";
    this.$app.style.display = "none";

    this.ui.start("#firebaseui-auth-container", {
      signInOptions: [firebase.auth.EmailAuthProvider.PROVIDER_ID],
    });
  }

  toggleContent() {
    if ((this.$Content.style.display = "block")) {
      this.$Content.style.display = "none";
      this.$profileContent.style.display = "block";
    }
  }

  ReturnHome() {
    if ((this.$Content.style.display = "none")) {
      this.$Content.style.display = "block";
      this.$profileContent.style.display = "none";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => new App());