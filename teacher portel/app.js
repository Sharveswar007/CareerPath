// Teacher Portal - Main Application
// Professional Student Management System

// SUPABASE_CONFIG is loaded from config.js (global variable)

// Initialize Supabase Client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Global State
let currentTeacher = null;
let allStudents = [];
let filteredStudents = [];
let studentDetailsCache = new Map();

// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initializeApp();
});

// ============================================
// INITIALIZATION
// ============================================

async function initializeApp() {
    // Check for existing session
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        currentTeacher = session.user;
        await loadDashboard();
    } else {
        showView('login');
    }

    // Setup event listeners
    setupEventListeners();

    // Auth state listener
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session) {
            currentTeacher = session.user;
            loadDashboard();
        } else {
            currentTeacher = null;
            showView('login');
        }
    });
}

function setupEventListeners() {
    // Login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    // Signup button
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', handleSignup);
    }

    // Form toggle buttons
    const showSignupBtn = document.getElementById('show-signup');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', () => {
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('signup-form').classList.remove('hidden');
            lucide.createIcons();
        });
    }

    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            document.getElementById('signup-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
            lucide.createIcons();
        });
    }

    // Enter key press on login form
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail && loginPassword) {
        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    // Enter key press on signup form
    const signupPassword = document.getElementById('signup-password');
    if (signupPassword) {
        signupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSignup();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    // Modal close
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    // Modal overlay
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tabId}`)?.classList.add('active');

            lucide.createIcons();
        });
    });
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin() {
    console.log('Attempting login...');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Supabase Login Error:', error);
            alert('Login Failed: ' + error.message);
            return;
        }

        console.log('Login Successful:', data);
        // Auth state change listener will handle the redirect/UI update

    } catch (err) {
        console.error('Unexpected Login Error:', err);
        alert('An unexpected error occurred during login');
    }
}

async function handleSignup() {
    console.log('Attempting signup...');
    const fullName = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (error) {
            console.error('Supabase Signup Error:', error);
            alert('Signup Failed: ' + error.message);
            return;
        }

        console.log('Signup Successful:', data);
        alert('Account created! Please check your email to confirm.');

        // Switch to login view
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');

    } catch (err) {
        console.error('Unexpected Signup Error:', err);
        alert('An unexpected error occurred during signup');
    }
}

async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log('Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    showView('dashboard');

    // Update teacher info
    const teacherName = document.getElementById('teacher-name');
    const teacherAvatar = document.getElementById('teacher-avatar');
    const welcomeTitle = document.getElementById('welcome-title');

    if (teacherName) {
        teacherName.textContent = currentTeacher.user_metadata?.full_name || currentTeacher.email.split('@')[0];
    }
    if (teacherAvatar) {
        // Hide avatar for email/password users (no avatar URL)
        const avatarUrl = currentTeacher.user_metadata?.avatar_url;
        if (avatarUrl) {
            teacherAvatar.src = avatarUrl;
        } else {
            teacherAvatar.style.display = 'none';
        }
    }
    if (welcomeTitle) {
        const displayName = currentTeacher.user_metadata?.full_name?.split(' ')[0]
            || currentTeacher.email.split('@')[0];
        welcomeTitle.textContent = `Welcome back, ${displayName}!`;
    }

    // Show loading state
    document.getElementById('loading-state')?.classList.remove('hidden');
    document.getElementById('empty-state')?.classList.add('hidden');
    document.getElementById('table-container')?.classList.add('hidden');

    // Fetch student data
    await fetchStudentData();
}

async function fetchStudentData() {
    try {
        const teacherEmail = currentTeacher.email;

        // Query all students where faculty_advisor_email matches teacher email
        const { data: profiles, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('faculty_advisor_email', teacherEmail);

        if (profilesError) throw profilesError;

        if (!profiles || profiles.length === 0) {
            showEmptyState();
            return;
        }

        // Fetch additional data for each student
        const studentIds = profiles.map(p => p.id);

        // Fetch assessments
        const { data: assessments } = await supabaseClient
            .from('user_assessments')
            .select('user_id, selected_career, total_score, career_score, logic_score')
            .in('user_id', studentIds);

        // Fetch skills gap analysis (Note: RLS may block access - see console for errors)
        const { data: gapAnalysis, error: gapError } = await supabaseClient
            .from('skills_gap_analysis')
            .select('user_id, readiness_score, target_career, strengths, weaknesses, gap_analysis, roadmap')
            .in('user_id', studentIds);

        if (gapError) {
            console.error('Skills Gap Analysis fetch error:', gapError);
            // RLS likely blocking access - teacher can't see student data by default
        }

        console.log('Gap Analysis Data:', gapAnalysis);

        // Fetch coding submissions
        const { data: submissions } = await supabaseClient
            .from('coding_submissions')
            .select('user_id, status')
            .in('user_id', studentIds)
            .eq('status', 'passed');

        // Fetch resume analyses
        const { data: resumes } = await supabaseClient
            .from('resume_analyses')
            .select('user_id, id, ats_score')
            .in('user_id', studentIds);

        // Fetch chat history
        const { data: chats } = await supabaseClient
            .from('chat_history')
            .select('user_id, id')
            .in('user_id', studentIds);

        // Combine all data
        allStudents = profiles.map(profile => {
            const assessment = assessments?.find(a => a.user_id === profile.id);
            const gap = gapAnalysis?.find(g => g.user_id === profile.id);
            const challengeCount = submissions?.filter(s => s.user_id === profile.id).length || 0;
            const resumeCount = resumes?.filter(r => r.user_id === profile.id).length || 0;
            const chatCount = chats?.filter(c => c.user_id === profile.id).length || 0;
            const latestResume = resumes?.filter(r => r.user_id === profile.id)[0];

            return {
                ...profile,
                selected_career: assessment?.selected_career || gap?.target_career || '-',
                total_score: assessment?.total_score || 0,
                career_score: assessment?.career_score || 0,
                logic_score: assessment?.logic_score || 0,
                readiness_score: gap?.readiness_score || 0,
                strengths: gap?.strengths || [],
                weaknesses: gap?.weaknesses || [],
                gap_analysis: gap?.gap_analysis || null,
                roadmap: gap?.roadmap || null,
                challenges_solved: challengeCount,
                resumes_analyzed: resumeCount,
                chat_sessions: chatCount,
                latest_ats_score: latestResume?.ats_score || null
            };
        });

        filteredStudents = [...allStudents];
        renderStudentTable();
        updateStats();

        // Setup real-time subscriptions
        setupRealtimeSubscriptions();

    } catch (error) {
        console.error('Error fetching student data:', error);
        showToast('Failed to load student data', 'error');
        showEmptyState();
    }
}

let isRealtimeSubscribed = false;

function setupRealtimeSubscriptions() {
    if (isRealtimeSubscribed) return;

    // Subscribe to profiles table changes
    supabaseClient
        .channel('profiles-changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'profiles', filter: `faculty_advisor_email=eq.${currentTeacher.email}` },
            () => fetchStudentData()
        )
        .subscribe();

    // Subscribe to assessments changes
    supabaseClient
        .channel('assessments-changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'user_assessments' },
            () => fetchStudentData()
        )
        .subscribe();

    // Subscribe to gap analysis changes
    supabaseClient
        .channel('gap-analysis-changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'skills_gap_analysis' },
            () => fetchStudentData()
        )
        .subscribe();

    isRealtimeSubscribed = true;
}

// ============================================
// UI RENDERING
// ============================================

function renderStudentTable() {
    const tbody = document.getElementById('students-tbody');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const tableContainer = document.getElementById('table-container');

    loadingState?.classList.add('hidden');

    if (filteredStudents.length === 0) {
        emptyState?.classList.remove('hidden');
        tableContainer?.classList.add('hidden');
        return;
    }

    emptyState?.classList.add('hidden');
    tableContainer?.classList.remove('hidden');

    tbody.innerHTML = filteredStudents.map(student => {
        const initials = getInitials(student.full_name || student.email);
        const avatarUrl = student.avatar_url;
        const readinessClass = getScoreClass(student.readiness_score);
        const scoreClass = getScoreClass(student.total_score);

        return `
            <tr onclick="showStudentDetail('${student.id}')">
                <td>
                    <div class="student-cell">
                        ${avatarUrl
                ? `<img src="${avatarUrl}" alt="${student.full_name}" class="student-avatar">`
                : `<div class="student-avatar">${initials}</div>`
            }
                        <div class="student-info">
                            <h4>${student.full_name || 'Unknown'}</h4>
                            <p>${student.email}</p>
                        </div>
                    </div>
                </td>
                <td>${student.college || '-'}</td>
                <td><span class="badge badge-gray">${student.selected_career}</span></td>
                <td><span class="score ${scoreClass}">${student.total_score || 0}/100</span></td>
                <td><span class="score ${readinessClass}">${student.readiness_score || 0}%</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="event.stopPropagation(); showStudentDetail('${student.id}')">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
}

function updateStats() {
    const totalStudents = allStudents.length;
    const avgReadiness = totalStudents > 0
        ? Math.round(allStudents.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / totalStudents)
        : 0;
    const totalChallenges = allStudents.reduce((sum, s) => sum + (s.challenges_solved || 0), 0);
    const totalAssessments = allStudents.filter(s => s.total_score > 0).length;

    document.getElementById('total-students').textContent = totalStudents;
    document.getElementById('avg-readiness').textContent = `${avgReadiness}%`;
    document.getElementById('total-challenges').textContent = totalChallenges;
    document.getElementById('total-assessments').textContent = totalAssessments;
}

function showEmptyState() {
    document.getElementById('loading-state')?.classList.add('hidden');
    document.getElementById('table-container')?.classList.add('hidden');
    document.getElementById('empty-state')?.classList.remove('hidden');

    // Update stats to zero
    document.getElementById('total-students').textContent = '0';
    document.getElementById('avg-readiness').textContent = '0%';
    document.getElementById('total-challenges').textContent = '0';
    document.getElementById('total-assessments').textContent = '0';
}

// ============================================
// STUDENT DETAIL MODAL
// ============================================

async function showStudentDetail(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;

    const modal = document.getElementById('student-modal');

    // Reset to first tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="overview"]')?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-overview')?.classList.add('active');

    // Populate header
    document.getElementById('modal-name').textContent = student.full_name || 'Unknown';
    document.getElementById('modal-email').textContent = student.email;

    const avatarUrl = student.avatar_url;
    const initials = getInitials(student.full_name || student.email);
    const modalAvatar = document.getElementById('modal-avatar');
    if (avatarUrl) {
        modalAvatar.src = avatarUrl;
        modalAvatar.style.display = '';
        modalAvatar.textContent = '';
    } else {
        modalAvatar.src = '';
        modalAvatar.style.display = 'flex';
        modalAvatar.style.alignItems = 'center';
        modalAvatar.style.justifyContent = 'center';
        modalAvatar.style.background = 'linear-gradient(135deg, var(--gray-700), var(--gray-800))';
        modalAvatar.textContent = initials;
    }

    // Tab: Overview - Personal Information
    document.getElementById('modal-phone').textContent = student.phone || '-';
    document.getElementById('modal-location').textContent = student.location || '-';
    document.getElementById('modal-dob').textContent = student.date_of_birth ? formatDate(student.date_of_birth) : '-';
    document.getElementById('modal-personal-email').textContent = student.personal_email || '-';

    // Academic Information
    document.getElementById('modal-college').textContent = student.college || '-';
    document.getElementById('modal-education').textContent = student.current_education || '-';
    document.getElementById('modal-10th').textContent = student.tenth_marks || '-';
    document.getElementById('modal-12th').textContent = student.twelfth_marks || '-';

    // Family Information
    document.getElementById('modal-father-name').textContent = student.father_name || '-';
    document.getElementById('modal-father-email').textContent = student.father_email || '-';
    document.getElementById('modal-father-phone').textContent = student.father_phone || '-';
    document.getElementById('modal-mother-name').textContent = student.mother_name || '-';
    document.getElementById('modal-mother-email').textContent = student.mother_email || '-';
    document.getElementById('modal-mother-phone').textContent = student.mother_phone || '-';

    // Tab: Skills - Career Readiness Gauge
    const readinessScore = student.readiness_score || 0;
    document.getElementById('readiness-display').textContent = `${readinessScore}%`;
    document.getElementById('modal-career').textContent = student.selected_career || '-';

    // Animate the SVG gauge arc (total arc length is ~126)
    const arc = document.getElementById('readiness-arc');
    if (arc) {
        const arcLength = (readinessScore / 100) * 126;
        setTimeout(() => {
            arc.style.transition = 'stroke-dasharray 1s ease-out';
            arc.setAttribute('stroke-dasharray', `${arcLength} 126`);
        }, 100);
    }

    // Strengths & Weaknesses
    const strengthsList = document.getElementById('modal-strengths');
    const weaknessesList = document.getElementById('modal-weaknesses');

    if (student.strengths && student.strengths.length > 0) {
        strengthsList.innerHTML = student.strengths.map(s => `<li>${s}</li>`).join('');
    } else {
        strengthsList.innerHTML = '<li>No data available</li>';
    }

    if (student.weaknesses && student.weaknesses.length > 0) {
        weaknessesList.innerHTML = student.weaknesses.map(w => `<li>${w}</li>`).join('');
    } else {
        weaknessesList.innerHTML = '<li>No data available</li>';
    }

    // Activity Stats
    document.getElementById('modal-challenges').textContent = student.challenges_solved || 0;
    document.getElementById('modal-resumes').textContent = student.resumes_analyzed || 0;
    document.getElementById('modal-chats').textContent = student.chat_sessions || 0;

    // Tab: Progress - Fetch Assessment History
    await loadAssessmentHistory(student.id);

    modal.classList.add('active');
    lucide.createIcons();
}

async function loadAssessmentHistory(userId) {
    const timeline = document.getElementById('assessment-timeline');
    const improvement = document.getElementById('overall-improvement');
    const comparison = document.getElementById('score-comparison');

    // Show loading
    timeline.innerHTML = '<div class="timeline-empty"><div class="skeleton" style="width: 100%; height: 60px; margin-bottom: 1rem;"></div><div class="skeleton" style="width: 100%; height: 60px;"></div></div>';

    try {
        // Fetch all assessments for this user
        const { data: assessments, error } = await supabaseClient
            .from('user_assessments')
            .select('id, selected_career, total_score, career_score, logic_score, completed_at')
            .eq('user_id', userId)
            .order('completed_at', { ascending: false });

        if (error) throw error;

        if (!assessments || assessments.length === 0) {
            timeline.innerHTML = `
                <div class="timeline-empty">
                    <i data-lucide="clipboard-list"></i>
                    <p>No assessments taken yet</p>
                </div>
            `;
            improvement.querySelector('.improvement-number').textContent = '-';
            comparison.innerHTML = '<p class="comparison-empty">Take multiple assessments to see comparison</p>';
            lucide.createIcons();
            return;
        }

        // Render timeline
        timeline.innerHTML = assessments.map((a, index) => `
            <div class="timeline-item ${index === 0 ? 'latest' : ''}" style="animation-delay: ${index * 0.1}s;">
                <div class="timeline-card">
                    <div class="timeline-header">
                        <span class="timeline-date">${formatDate(a.completed_at)}</span>
                        ${index === 0 ? '<span class="timeline-badge">Latest</span>' : `<span class="timeline-badge" style="background: var(--gray-500);">Attempt ${assessments.length - index}</span>`}
                    </div>
                    <div class="timeline-scores">
                        <div class="timeline-score">
                            <span class="timeline-score-label">Total</span>
                            <span class="timeline-score-value">${a.total_score || 0}/20</span>
                        </div>
                        <div class="timeline-score">
                            <span class="timeline-score-label">Career</span>
                            <span class="timeline-score-value">${a.career_score || 0}/10</span>
                        </div>
                        <div class="timeline-score">
                            <span class="timeline-score-label">Logic</span>
                            <span class="timeline-score-value">${a.logic_score || 0}/10</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Calculate improvement (compare first and last)
        if (assessments.length >= 2) {
            const latest = assessments[0].total_score || 0;
            const oldest = assessments[assessments.length - 1].total_score || 0;
            const diff = latest - oldest;
            const diffPercent = oldest > 0 ? Math.round((diff / oldest) * 100) : 0;

            const improvementNum = improvement.querySelector('.improvement-number');
            if (diff > 0) {
                improvementNum.textContent = `+${diffPercent}%`;
                improvementNum.classList.add('improvement-positive');
                improvementNum.classList.remove('improvement-negative');
            } else if (diff < 0) {
                improvementNum.textContent = `${diffPercent}%`;
                improvementNum.classList.add('improvement-negative');
                improvementNum.classList.remove('improvement-positive');
            } else {
                improvementNum.textContent = '0%';
                improvementNum.classList.remove('improvement-positive', 'improvement-negative');
            }

            // Score comparison bars
            const latestData = assessments[0];
            const firstData = assessments[assessments.length - 1];

            comparison.innerHTML = `
                <div class="comparison-row">
                    <span class="comparison-label">First Attempt</span>
                    <div class="comparison-bar">
                        <div class="comparison-fill test-1" style="width: ${(firstData.total_score / 20) * 100}%"></div>
                    </div>
                    <span class="comparison-value">${firstData.total_score || 0}/20</span>
                </div>
                <div class="comparison-row">
                    <span class="comparison-label">Latest Attempt</span>
                    <div class="comparison-bar">
                        <div class="comparison-fill test-2" style="width: ${(latestData.total_score / 20) * 100}%"></div>
                    </div>
                    <span class="comparison-value">${latestData.total_score || 0}/20</span>
                </div>
            `;
        } else {
            improvement.querySelector('.improvement-number').textContent = 'First Test';
            comparison.innerHTML = '<p class="comparison-empty">Complete another assessment to see comparison</p>';
        }

        lucide.createIcons();

    } catch (error) {
        console.error('Error loading assessment history:', error);
        timeline.innerHTML = `
            <div class="timeline-empty">
                <i data-lucide="alert-circle"></i>
                <p>Failed to load assessment history</p>
            </div>
        `;
        lucide.createIcons();
    }
}

function closeModal() {
    const modal = document.getElementById('student-modal');
    modal?.classList.remove('active');

    // Reset gauge animation
    const arc = document.getElementById('readiness-arc');
    if (arc) {
        arc.style.transition = 'none';
        arc.setAttribute('stroke-dasharray', '0 126');
    }
}

// ============================================
// SEARCH & FILTER
// ============================================

function handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();

    if (!query) {
        filteredStudents = [...allStudents];
    } else {
        filteredStudents = allStudents.filter(student => {
            return (
                (student.full_name?.toLowerCase().includes(query)) ||
                (student.email?.toLowerCase().includes(query)) ||
                (student.college?.toLowerCase().includes(query)) ||
                (student.selected_career?.toLowerCase().includes(query))
            );
        });
    }

    renderStudentTable();
}

// ============================================
// EXCEL EXPORT
// ============================================

function handleExport() {
    try {
        if (allStudents.length === 0) {
            showToast('No student data to export', 'info');
            return;
        }

        // Prepare data for export
        const exportData = allStudents.map(student => ({
            'Full Name': student.full_name || '',
            'Email': student.email || '',
            'Phone': student.phone || '',
            'Location': student.location || '',
            'Date of Birth': student.date_of_birth || '',
            'College': student.college || '',
            'Current Education': student.current_education || '',
            '10th Marks': student.tenth_marks || '',
            '12th Marks': student.twelfth_marks || '',
            'Selected Career': student.selected_career || '',
            'Quiz Score': student.total_score || 0,
            'Career Readiness': `${student.readiness_score || 0}%`,
            'Challenges Solved': student.challenges_solved || 0,
            'Resumes Analyzed': student.resumes_analyzed || 0,
            'Chat Sessions': student.chat_sessions || 0,
            'Father Name': student.father_name || '',
            'Father Email': student.father_email || '',
            'Father Phone': student.father_phone || '',
            'Mother Name': student.mother_name || '',
            'Mother Email': student.mother_email || '',
            'Mother Phone': student.mother_phone || '',
            'Faculty Advisor Email': student.faculty_advisor_email || ''
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Students');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `students_export_${timestamp}.xlsx`;

        // Download file
        XLSX.writeFile(wb, filename);

        showToast('Export successful!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export data', 'error');
    }
}

// ============================================
// THEME
// ============================================

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    if (newTheme === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }

    // Save preference
    localStorage.setItem('theme', newTheme);
    lucide.createIcons();
}

// Load theme on init
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(`${viewId}-view`)?.classList.add('active');
}

function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function getScoreClass(score) {
    if (!score || score === 0) return '';
    if (score >= 70) return 'score-high';
    if (score >= 50) return 'score-medium';
    return 'score-low';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
        success: 'check-circle',
        error: 'x-circle',
        info: 'info'
    };

    toast.innerHTML = `
        <i data-lucide="${iconMap[type]}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions global for onclick handlers
window.showStudentDetail = showStudentDetail;
