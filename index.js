// setTimeout(() => {
//   window.location.href = "home.html";
// }, 4000);
// //fade in effect 
// document.body.style.opacity = 0;
// let opacity = 0;
// const fadeIn = setInterval(() => {
//   if (opacity < 1) {
//     opacity += 0.02;
//     document.body.style.opacity = opacity;
//   } else {
//     clearInterval(fadeIn);
//   }
// }, 30);
 function fadeAndRedirect(url) {
    // Add fade-out class to the body
    document.body.classList.add('fade-out');

    // Wait for the transition to finish, then redirect
    setTimeout(function() {
      window.location.href = 'home.html';
    }, 1000); // 1000ms matches the CSS transition duration
  }

  // Example: fade out after 2 seconds
  setTimeout(function() {
    fadeAndRedirect('home.html');
  }, 2000);