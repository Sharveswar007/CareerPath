# 🎓 CareerPath Teacher Portal

> **Professional Student Management System for Career Guidance**

A modern, real-time teacher dashboard that enables faculty advisors to monitor student career progress, view assessment results, and export comprehensive reports. Built with Vanilla JavaScript and powered by Supabase.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-ISC-green)
![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)

---

## ✨ Features

### 🔐 Authentication
- **Email/Password Login** - Secure teacher sign-in with Supabase Auth
- **Email/Password Signup** - New teacher registration
- **Automatic Session Management** - Persistent login state
- **Secure Logout** - Clean session termination

### 👥 Student Management
- **Real-time Data Sync** - Live updates from Supabase database
- **Searchable Table** - Filter students by name, email, college, or career
- **Auto-refresh** - Automatic updates when student data changes
- **Faculty-Student Mapping** - Teachers only see their assigned students

### 📊 Student Details Modal
- **Personal Information** - Name, email, phone, location, DOB
- **Academic Records** - College, education level, 10th/12th marks
- **Family Information** - Parent contacts and details
- **Career Progress** - Selected career path and readiness score
- **Skills Analysis** - Strengths and weaknesses breakdown
- **Assessment History** - Complete assessment results with scores

### 📈 Dashboard Statistics
- **Total Students** - Count of assigned students
- **Active Learners** - Students with recent activity
- **Average Score** - Mean assessment performance
- **Completion Rate** - Percentage of completed assessments

### 📤 Data Export
- **Excel Export (.xlsx)** - One-click export via SheetJS
- **Comprehensive Data** - All student fields included
- **Timestamped Files** - Auto-named with export date

### 🎨 Premium UI/UX
- **Glassmorphism Design** - Modern blurred glass card effects
- **Premium Animations** - Smooth entrance animations and micro-interactions
- **Animated Backgrounds** - Aurora gradients, morphing orbs, floating particles
- **Dark Mode Support** - Complete light/dark theme switching
- **Responsive Layout** - Mobile-friendly design
- **Lucide Icons** - Beautiful, consistent iconography

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Vanilla JavaScript (ES6+)** | Core application logic |
| **Supabase** | Authentication & PostgreSQL database |
| **Vite** | Development server & build tool |
| **SheetJS (XLSX)** | Excel file generation |
| **Lucide Icons** | UI iconography |
| **CSS3** | Custom animations & styling |

---

## 📁 Project Structure

```
careerpath-teacher-portel/
├── index.html              # Main HTML file with all views
├── app.js                  # Application logic (888 lines)
│   ├── Authentication      # Login, signup, logout handlers
│   ├── Dashboard           # Student data fetching & stats
│   ├── UI Rendering        # Table and modal rendering
│   ├── Real-time Sync      # Supabase subscriptions
│   └── Utilities           # Helpers (toast, formatting)
├── styles.css              # Premium CSS (2370 lines)
│   ├── CSS Variables       # Design tokens & theme colors
│   ├── Login Animations    # Card entrance, form effects
│   ├── Animated Backgrounds # Orbs, particles, aurora
│   ├── Glass Cards         # Glassmorphism effects
│   └── Responsive Styles   # Mobile adaptations
├── config.js               # Supabase configuration (Vite env)
├── .env                    # Environment variables (local)
├── .env.example            # Environment template
├── teacher_access_policies.sql  # Database RLS policies
├── package.json            # Project dependencies
├── QUICKSTART.txt          # Quick setup guide
└── README.md               # This documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- Supabase project with:
  - `profiles` table with student data
  - `user_assessments` table for assessment results
  - `skills_gap_analysis` table for skills data
  - Google OAuth or Email Auth enabled

### 1. Clone & Install

```bash
git clone https://github.com/Sharveswar007/careerpath-teacher-portel.git
cd careerpath-teacher-portel
npm install
```

### 2. Configure Environment

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Configure Database Policies

Run the SQL in `teacher_access_policies.sql` in your Supabase SQL Editor to enable teachers to view their students' data:

```sql
-- Allows teachers to view:
-- - skills_gap_analysis
-- - user_assessments
-- - coding_submissions
-- - resume_analyses
-- - chat_history
-- For students assigned via faculty_advisor_email
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
npm run preview
```

---

## 🔗 Student Assignment

Teachers see only students where `faculty_advisor_email` matches their login email.

### How to Assign Students:

1. **Student Portal**: Student logs in and edits their profile
2. **Faculty Advisor Field**: Student enters teacher's email address
3. **Save**: Student saves their profile
4. **Teacher Portal**: Teacher logs in and sees the student in their dashboard

---

## 📊 Database Schema

### Tables Used

| Table | Fields | Description |
|-------|--------|-------------|
| `profiles` | `full_name`, `email`, `phone`, `location`, `date_of_birth`, `college`, `current_education`, `tenth_marks`, `twelfth_marks`, `father_name`, `father_email`, `mother_name`, `faculty_advisor_email` | Student profile data |
| `user_assessments` | `user_id`, `selected_career`, `total_score`, `career_score`, `logic_score` | Career assessment results |
| `skills_gap_analysis` | `user_id`, `readiness_score`, `strengths`, `weaknesses` | Skills breakdown |
| `coding_submissions` | `user_id` | Coding challenge progress |
| `resume_analyses` | `user_id` | Resume review records |
| `chat_history` | `user_id` | AI guidance sessions |

---

## 🔧 Configuration

### config.js (Vite Environment)

```javascript
// Supabase Configuration
// Loaded via Vite environment variables

export const SUPABASE_CONFIG = {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
};
```

---

## ❓ Troubleshooting

### No Students Showing?
1. ✅ Verify your email matches `faculty_advisor_email` in student profiles
2. ✅ Check browser console (F12) for API errors
3. ✅ Confirm database RLS policies are applied

### Login Not Working?
1. ✅ Verify Supabase credentials in `.env`
2. ✅ Check Email Auth is enabled in Supabase dashboard
3. ✅ Clear browser cache and try again

### Export Not Working?
1. ✅ Verify SheetJS library is loaded (check console)
2. ✅ Ensure you have students to export
3. ✅ Check if browser is blocking downloads

### Real-time Updates Not Working?
1. ✅ Check Supabase real-time is enabled
2. ✅ Verify database publication settings
3. ✅ Check network connectivity

---

## 🔒 Security

- **Row Level Security (RLS)** - Teachers only access their assigned students
- **Environment Variables** - Credentials never committed to repo
- **Secure Authentication** - Supabase handles all auth security
- **Data Isolation** - Faculty-student mapping enforced at database level

---

## 📦 NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

## 🌐 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy

### Other Platforms

Build the project and serve the `dist/` folder:

```bash
npm run build
# Upload dist/ folder to your hosting provider
```

---

## 🤝 Related Projects

- **CareerPath Student Portal** - Student-facing career guidance platform
- **CareerPath Main Application** - Complete career assessment system

---

## 📄 License

ISC License - See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

**Sharveswar007**

- GitHub: [@Sharveswar007](https://github.com/Sharveswar007)
- Repository: [careerpath-teacher-portel](https://github.com/Sharveswar007/careerpath-teacher-portel)

---

<div align="center">

**Built with ❤️ for educators**

</div>
