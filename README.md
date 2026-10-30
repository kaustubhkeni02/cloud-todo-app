<div align="center">

# ☁️ Cloud To-Do

### A secure, serverless to-do app on Google Cloud

![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Cloud Run](https://img.shields.io/badge/Cloud_Run-Serverless-34A853?style=for-the-badge&logo=googlecloud&logoColor=white)
![Firestore](https://img.shields.io/badge/Firestore-NoSQL-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)

**[🚀 Live Demo](https://todo-app-773060009336.asia-south1.run.app)** · **[📸 Screenshots](#-screenshots)** · **[🏗️ Architecture](#%EF%B8%8F-architecture)**

</div>

---

## 📖 About

Cloud To-Do is a small full-stack web app built to demonstrate core cloud skills: **deploying to Google Cloud Run**, **integrating a cloud database (Firestore) with full CRUD**, and applying **cloud security** and **environment configuration** best practices.

It was built as a pre-interview cloud deployment task.

## ✨ Features

- ✅ **Full CRUD**: create, read, update (tick done) and delete tasks, stored in Firestore
- 🔐 **PIN-protected API**: every `/api` request needs an `X-Access-Pin` header, otherwise the server returns `401 Unauthorized`
- 🛡️ **Least-privilege IAM**: the app runs as a dedicated service account with only the *Cloud Datastore User* role
- 🔑 **Secret Manager**: the PIN is never in code or GitHub, it is injected at runtime
- 📈 **Autoscaling**: scales to zero when idle (min 0), capped at 5 instances, 20 concurrent requests per instance
- 🩺 **Health endpoint**: `/health` for quick checks and load testing
- 🧼 **Safe rendering**: task text is inserted with `textContent`, preventing script injection

## 🏗️ Architecture

```
┌───────────┐     HTTPS      ┌──────────────────────┐      ┌───────────┐
│  Browser  │ ─────────────► │  Cloud Run           │ ───► │ Firestore │
│  (UI)     │ ◄───────────── │  Node.js + Express   │ ◄─── │ (todos)   │
└───────────┘                └──────────┬───────────┘      └───────────┘
                                        │ reads PIN at startup
                                        ▼
                             ┌──────────────────────┐
                             │   Secret Manager     │
                             │   (app-pin)          │
                             └──────────────────────┘

  Runs as service account:  todo-sa  (Cloud Datastore User only)
```

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js 22, Express |
| Database | Google Cloud Firestore (Native mode, `asia-south1`) |
| Hosting | Google Cloud Run (serverless containers) |
| Build | Cloud Build + Buildpacks (no Dockerfile needed) |
| Secrets | Google Secret Manager |
| Identity | IAM service account (`todo-sa`) |

## 🔌 API Reference

All `/api` routes require the header `X-Access-Pin: <your pin>`.

| Method | Endpoint | Description | CRUD |
|---|---|---|---|
| `POST` | `/api/todos` | Add a new task | **C**reate |
| `GET` | `/api/todos` | List all tasks | **R**ead |
| `PUT` | `/api/todos/:id` | Update a task (e.g. `{"done": true}`) | **U**pdate |
| `DELETE` | `/api/todos/:id` | Delete a task | **D**elete |
| `GET` | `/health` | Health check (no PIN needed) | n/a |

**Example (PowerShell):**

```powershell
$URL = "https://todo-app-773060009336.asia-south1.run.app"
$h = @{ "X-Access-Pin" = "YOUR_PIN" }

# Create
$r = Invoke-RestMethod -Method Post -Uri "$URL/api/todos" -Headers $h -ContentType "application/json" -Body '{"title":"Learn GCP"}'

# Read
Invoke-RestMethod -Uri "$URL/api/todos" -Headers $h

# Update
Invoke-RestMethod -Method Put -Uri "$URL/api/todos/$($r.id)" -Headers $h -ContentType "application/json" -Body '{"done":true}'

# Delete
Invoke-RestMethod -Method Delete -Uri "$URL/api/todos/$($r.id)" -Headers $h

# Without the PIN -> 401 Unauthorized
Invoke-RestMethod -Uri "$URL/api/todos"
```

## 🔒 Security Design

| Measure | Why it matters |
|---|---|
| Dedicated service account `todo-sa` | The app does not use the powerful default account |
| Only `roles/datastore.user` | If the app were compromised, it could only touch Firestore |
| Secret Manager for the PIN | No secrets in code, Git or environment files |
| Secret access granted on that one secret | Tighter than project-wide access |
| No key file anywhere | Cloud Run supplies credentials through the attached service account |
| `.gitignore` for `.env`, `key.txt`, `node_modules` | Prevents accidental secret uploads |

## ⚙️ Environment Configuration

| Setting | Value | Purpose |
|---|---|---|
| Min instances | `0` | Scale to zero, pay nothing when idle |
| Max instances | `5` | Cost cap and controlled scaling |
| Concurrency | `20` | Requests one instance handles before another starts |
| Memory | `512Mi` | Per-instance memory |
| Region | `asia-south1` (Mumbai) | Low latency, next to the database |

## 🚀 Deploy It Yourself

**Prerequisites:** a Google Cloud account with billing enabled and the [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed.

```bash
# 1. Set your project and enable the APIs
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com firestore.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

# 2. Create the Firestore database
gcloud firestore databases create --location=asia-south1 --type=firestore-native

# 3. Create the service account and give it Firestore access only
gcloud iam service-accounts create todo-sa --display-name="Todo app runtime"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:todo-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# 4. Store your PIN in Secret Manager (use your own PIN)
printf "YOUR_PIN" | gcloud secrets create app-pin --data-file=-
gcloud secrets add-iam-policy-binding app-pin \
  --member="serviceAccount:todo-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 5. Deploy to Cloud Run
gcloud run deploy todo-app --source . --region asia-south1 \
  --service-account todo-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets APP_PIN=app-pin:latest \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 5 --concurrency 20 --memory 512Mi
```

## 📁 Project Structure

```
todo-app/
├── public/
│   └── index.html      # Frontend (UI)
├── server.js           # Express backend + Firestore CRUD + PIN check
├── package.json        # Dependencies and start script
├── .gitignore          # Keeps secrets out of Git
└── README.md
```

## 📸 Screenshots

| App UI | Wrong PIN |
|---|---|
| ![App](screenshots/05-app-ui.png) | ![Wrong PIN](screenshots/06-wrong-pin.png) |

| Firestore data | 401 security test |
|---|---|
| ![Firestore](screenshots/01-firestore.png) | ![401](screenshots/04-security-401.png) |

| Cloud Run | IAM | Secret Manager |
|---|---|---|
| ![Cloud Run](screenshots/07-cloud-run.png) | ![IAM](screenshots/08-iam.png) | ![Secrets](screenshots/09-secret-manager.png) |

## 🧠 What I Learned

- How to take an app from local code to a live HTTPS service using **Cloud Run** and **Cloud Build**.
- Why **least privilege** matters: a custom service account with one role is safer than the default.
- How **Secret Manager** keeps credentials out of source code.
- How to debug a failed build by reading the **Cloud Build log**. My first deploy failed because `package.json` requested Node 20, which the builder no longer offered, so I changed it to Node 22.
- How **concurrency**, **min/max instances** and **scale to zero** control cost and scaling.

## 🔮 Future Improvements

- Per-user login with Firebase Authentication instead of a shared PIN
- Rate limiting and Cloud Armor for abuse protection
- CI/CD with Cloud Build triggers on every push
- Monitoring and alerting with Cloud Monitoring

## 👤 Author

**Kaustubh**

If you found this useful, a ⭐ on the repo is appreciated.
