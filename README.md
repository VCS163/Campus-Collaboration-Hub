# Campus Collaboration Hub

**Find your people. Move ideas forward.**

Campus Collaboration Hub is a student-focused collaboration prototype that helps students discover campus activities, form short-term groups, contribute to projects, exchange learning support, and share campus information.

## Live demo

**[Open Campus Collaboration Hub](https://vcs163.github.io/Campus-Collaboration-Hub/)**

The site is deployed using GitHub Pages from the repository's `main` branch.

## Project overview

The hub is organised around four areas of student collaboration. A shared student profile is used across the application.

### 1. Temporary Clubs and Interest Groups

- Browse available clubs and interest groups.
- Create a time-bounded club with a goal, category, and duration.
- Join a club and view its membership.
- Archive a club when its activity is complete.

### 2. Project and Contributor Collaboration

- Browse project and campus opportunities.
- Create an opportunity and define contributor roles.
- Apply for a specific role.
- Allow the opportunity owner to accept or reject applications.
- Track opportunity status through its lifecycle.

### 3. Learning and Mentorship Exchange

- Browse peer-mentoring offers and learning requests.
- Publish a mentoring offer or a request to learn.
- Request mentorship and let the mentor accept or reject the request.
- Use learning groups and milestones to represent progress.

### 4. Campus Community and Information Sharing

- Browse predefined campus communities.
- Publish discussion, question, or resource posts.
- Open post details, add comments, and react to posts.

### Shared student profile

Students can view and edit their profile information, including their bio, branch/year, skills they can contribute, and skills they are learning. The same demo-student identity is referenced by the different collaboration areas.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript using ES modules
- Browser `localStorage` for prototype data persistence
- Node.js built-in test runner for automated tests
- GitHub Pages for static hosting

The project does not require a frontend framework, bundler, or runtime package dependencies.

## Run locally

Serve the project directory over HTTP. Do not open `index.html` directly using a `file://` URL; the application uses JavaScript ES modules.

### Option A: Python HTTP server

From the repository root, run:

```powershell
py -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

Keep the terminal running while using the application. Press `Ctrl+C` to stop the server.

### Option B: VS Code Live Server

Open the repository folder in VS Code, start Live Server from `index.html`, and open the local URL shown by the extension.

## Demo data and persistence

- The application initializes demonstration data in the browser on first use.
- The header includes a **Demo user** selector to switch between the sample student profiles.
- Changes are saved in the current browser's `localStorage` and normally remain after refreshing the page in that same browser and site origin.
- The **Reset demo** control restores the original seeded demonstration data for that browser and site origin.
- Data is not shared between different browsers, devices, or visitors. The local development site and the GitHub Pages site also use separate browser storage origins.

> **Prototype limitation:** The demo-user selector is for demonstrating different student perspectives. It is not real authentication or access control. This prototype has no backend database, server-side accounts, or cross-user data synchronisation. Do not enter sensitive or private information.

## Run automated tests

Install a current Node.js release, open a terminal in the repository root, and run:

```powershell
npm test
```

This runs the test suite using Node.js's built-in `node --test` runner. No `npm install` step is required for the current project because `package.json` declares no external dependencies.

The tests cover application navigation and module-level behaviour across clubs, projects, learning/mentorship, and community functionality.

## Repository structure

```text
Campus-Collaboration-Hub/
├── assets/       # Static assets such as the favicon
├── css/          # Design tokens, base styles, components, and page styles
├── js/
│   ├── clubs/    # Temporary clubs and membership flows
│   ├── community/# Community feeds, posts, comments, and reactions
│   ├── learning/ # Learning requests, mentoring, and groups
│   ├── profile/  # Shared student profile
│   ├── projects/ # Opportunities, roles, and applications
│   ├── shared/   # Storage, seed data, validation, events, and UI helpers
│   ├── app.js    # Application startup and top-level navigation
│   └── router.js # Hash-based client-side router
├── tests/        # Automated tests
├── index.html    # Application entry point
├── package.json  # Project metadata and test script
└── README.md
```

## Deployment

The project is a static frontend and can be hosted using GitHub Pages:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select `main` and the `/(root)` folder, then save.
4. GitHub Pages publishes the site at:

   `https://vcs163.github.io/Campus-Collaboration-Hub/`

Updates pushed to the configured publishing branch are published by GitHub Pages after its deployment workflow completes.

## Repository

[https://github.com/VCS163/Campus-Collaboration-Hub](https://github.com/VCS163/Campus-Collaboration-Hub)
