cd "$HOME\Campus-Collaboration-Hub-work"

gh auth status
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c docs/member-3-contribution

New-Item -ItemType Directory -Force "docs/contributions/member-3" | Out-Null

@'
# Member 3 — Learning and Mentorship

**GitHub:** looser-lag  
**Branch:** feat/learning-mentorship

## Contribution Overview

Implemented the Learning and Mentorship module of the Campus Collaboration Hub.

The objective is to help students exchange knowledge, discover peer mentors and collaborate around specific learning objectives.

## 1. Mentor Directory

- Implemented mentor offer listings.
- Added mentor offer creation.
- Added topic-based mentor information.
- Implemented mentor detail views.
- Added learner capacity management.
- Implemented mentor offer closure.

## 2. Learning Requests

- Implemented learning request creation.
- Added learning topic and goal information.
- Added learning mode selection.
- Implemented request closure.
- Added validation for learning requests.

## 3. Mentorship Requests

- Implemented mentorship request submission.
- Prevented duplicate active requests.
- Added mentor-controlled acceptance and rejection.
- Prevented requests to closed offers.
- Added learner capacity checks.

## 4. Learning Groups

- Implemented learning group creation and reuse.
- Added group participant management.
- Implemented milestone creation and toggling.
- Added mentor-controlled group completion.
- Made completed learning groups read-only.

## 5. Implementation Files

- `js/learning/learningGroup.js`
- `js/learning/learningRequestForm.js`
- `js/learning/learningRoutes.js`
- `js/learning/learningService.js`
- `js/learning/mentorDetail.js`
- `js/learning/mentorForm.js`
- `js/learning/mentorList.js`
- `js/learning/mentorshipRequestForm.js`

## 6. Testing

Added:
- `tests/learning.test.js`

The tests cover mentor offers, learning requests, mentorship workflows, group management and milestone operations.

## 7. Contribution Summary

Delivered the Learning and Mentorship module, enabling students to offer guidance, request learning support and participate in structured peer-learning groups.
'@ | Set-Content "docs/contributions/member-3/README.md" -Encoding UTF8

git add docs/contributions/member-3/README.md
git diff --cached --check
git commit -m "docs: document learning and mentorship contribution"
git push -u origin docs/member-3-contribution
