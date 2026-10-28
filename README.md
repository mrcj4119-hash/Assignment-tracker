# Assignment tracker

A responsive, browser-based tool focused on tracking assignments. Instructors can create assignments, set due dates, monitor submissions, and record grades and feedback. Students can see their assignment status, submit work, and review grades and feedback.

The dashboard summarizes assignment status and recent submissions or feedback. The Assignments section is the central place to search, filter, submit, and review work. Sign out from the header.

## Run it

Open `index.html` in a modern browser. No build step or package installation is needed.

Create an account with an email or use **Preview instructor view** / **Preview student view** to explore the demo. Student and instructor roles have different assignment-focused views.

## Demo mode and storage

The demo starts with sample assignments and submissions. Accounts and assignment data are stored only in the current browser, and the sign-in session lasts for the current browser tab. Passwords are hashed with PBKDF2 before being saved, but this local-only demo has no server, school single sign-on, email verification, or shared storage between devices.

**Do not use real school credentials or sensitive student data in the demo.** For a real school deployment, connect the interface to a secure backend and school-managed identity provider with server-side authorization and database storage. Use the browser's site-data controls to reset the demo.
