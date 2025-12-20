// Curated Learning Resources Database
// Verified links to high-quality courses, tutorials, and platforms

export interface LearningResource {
    title: string;
    type: "course" | "tutorial" | "book" | "platform" | "certification" | "youtube";
    url: string;
    cost: "free" | "paid" | "freemium";
    provider: string;
    description: string;
    rating?: number;
}

export interface ResourceCategory {
    [topic: string]: LearningResource[];
}

export const PROGRAMMING_FUNDAMENTALS: LearningResource[] = [
    {
        title: "CS50: Introduction to Computer Science",
        type: "course",
        url: "https://cs50.harvard.edu/x/",
        cost: "free",
        provider: "Harvard/edX",
        description: "World-renowned intro to CS covering C, Python, SQL, and web development",
        rating: 4.9,
    },
    {
        title: "freeCodeCamp - Responsive Web Design",
        type: "course",
        url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
        cost: "free",
        provider: "freeCodeCamp",
        description: "Learn HTML, CSS with hands-on projects and certifications",
        rating: 4.8,
    },
    {
        title: "The Odin Project",
        type: "course",
        url: "https://www.theodinproject.com/",
        cost: "free",
        provider: "The Odin Project",
        description: "Full-stack curriculum with Ruby or JavaScript paths",
        rating: 4.8,
    },
    {
        title: "Codecademy - Learn to Code",
        type: "platform",
        url: "https://www.codecademy.com/",
        cost: "freemium",
        provider: "Codecademy",
        description: "Interactive coding lessons in multiple languages",
        rating: 4.6,
    },
];

export const DATA_STRUCTURES_ALGORITHMS: LearningResource[] = [
    {
        title: "NeetCode DSA Roadmap",
        type: "platform",
        url: "https://neetcode.io/roadmap",
        cost: "free",
        provider: "NeetCode",
        description: "Structured DSA learning path with LeetCode problems",
        rating: 4.9,
    },
    {
        title: "Striver's A2Z DSA Course",
        type: "youtube",
        url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/",
        cost: "free",
        provider: "Take U Forward",
        description: "Comprehensive DSA sheet popular in India for placements",
        rating: 4.9,
    },
    {
        title: "Abdul Bari - Algorithms",
        type: "youtube",
        url: "https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O",
        cost: "free",
        provider: "YouTube",
        description: "Clear algorithm explanations with animations",
        rating: 4.8,
    },
    {
        title: "LeetCode",
        type: "platform",
        url: "https://leetcode.com/",
        cost: "freemium",
        provider: "LeetCode",
        description: "Practice coding problems for technical interviews",
        rating: 4.7,
    },
    {
        title: "GeeksforGeeks DSA Self-Paced",
        type: "course",
        url: "https://www.geeksforgeeks.org/courses/dsa-self-paced",
        cost: "paid",
        provider: "GeeksforGeeks",
        description: "Structured DSA course with certificate",
        rating: 4.5,
    },
];

export const WEB_DEVELOPMENT: LearningResource[] = [
    {
        title: "Full Stack Open",
        type: "course",
        url: "https://fullstackopen.com/en/",
        cost: "free",
        provider: "University of Helsinki",
        description: "Modern web development with React, Node, MongoDB, GraphQL",
        rating: 4.9,
    },
    {
        title: "JavaScript.info",
        type: "tutorial",
        url: "https://javascript.info/",
        cost: "free",
        provider: "JavaScript.info",
        description: "Comprehensive modern JavaScript tutorial",
        rating: 4.8,
    },
    {
        title: "React Documentation",
        type: "tutorial",
        url: "https://react.dev/learn",
        cost: "free",
        provider: "React",
        description: "Official React docs with interactive examples",
        rating: 4.9,
    },
    {
        title: "Next.js Learn",
        type: "tutorial",
        url: "https://nextjs.org/learn",
        cost: "free",
        provider: "Vercel",
        description: "Build a full-stack Next.js app step by step",
        rating: 4.8,
    },
    {
        title: "Traversy Media",
        type: "youtube",
        url: "https://www.youtube.com/@TraversyMedia",
        cost: "free",
        provider: "YouTube",
        description: "Web development tutorials and crash courses",
        rating: 4.7,
    },
];

export const PYTHON_PROGRAMMING: LearningResource[] = [
    {
        title: "Python for Everybody",
        type: "course",
        url: "https://www.py4e.com/",
        cost: "free",
        provider: "Dr. Chuck (University of Michigan)",
        description: "Beginner-friendly Python course with exercises",
        rating: 4.9,
    },
    {
        title: "Automate the Boring Stuff with Python",
        type: "book",
        url: "https://automatetheboringstuff.com/",
        cost: "free",
        provider: "Al Sweigart",
        description: "Practical Python for automating everyday tasks",
        rating: 4.8,
    },
    {
        title: "Real Python",
        type: "tutorial",
        url: "https://realpython.com/",
        cost: "freemium",
        provider: "Real Python",
        description: "In-depth Python tutorials and guides",
        rating: 4.7,
    },
    {
        title: "Corey Schafer Python Tutorials",
        type: "youtube",
        url: "https://www.youtube.com/playlist?list=PL-osiE80TeTt2d9bfVyTiXJA-UTHn6WwU",
        cost: "free",
        provider: "YouTube",
        description: "Clear Python tutorials for beginners to advanced",
        rating: 4.8,
    },
];

export const DATA_SCIENCE_ML: LearningResource[] = [
    {
        title: "Andrew Ng - Machine Learning Specialization",
        type: "course",
        url: "https://www.coursera.org/specializations/machine-learning-introduction",
        cost: "freemium",
        provider: "Coursera/Stanford",
        description: "Foundational ML course by Andrew Ng",
        rating: 4.9,
    },
    {
        title: "fast.ai - Practical Deep Learning",
        type: "course",
        url: "https://course.fast.ai/",
        cost: "free",
        provider: "fast.ai",
        description: "Top-down approach to deep learning",
        rating: 4.9,
    },
    {
        title: "Kaggle Learn",
        type: "platform",
        url: "https://www.kaggle.com/learn",
        cost: "free",
        provider: "Kaggle",
        description: "Short courses on Python, ML, SQL, and more",
        rating: 4.7,
    },
    {
        title: "StatQuest with Josh Starmer",
        type: "youtube",
        url: "https://www.youtube.com/@statquest",
        cost: "free",
        provider: "YouTube",
        description: "Statistics and ML concepts explained simply",
        rating: 4.9,
    },
    {
        title: "Hands-On Machine Learning (Book)",
        type: "book",
        url: "https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/",
        cost: "paid",
        provider: "O'Reilly",
        description: "Practical ML with Scikit-Learn, Keras, TensorFlow",
        rating: 4.8,
    },
];

export const SYSTEM_DESIGN: LearningResource[] = [
    {
        title: "System Design Primer",
        type: "tutorial",
        url: "https://github.com/donnemartin/system-design-primer",
        cost: "free",
        provider: "GitHub",
        description: "Comprehensive system design study guide",
        rating: 4.9,
    },
    {
        title: "Gaurav Sen - System Design",
        type: "youtube",
        url: "https://www.youtube.com/@gaborsen",
        cost: "free",
        provider: "YouTube",
        description: "System design interview preparation videos",
        rating: 4.8,
    },
    {
        title: "ByteByteGo",
        type: "youtube",
        url: "https://www.youtube.com/@ByteByteGo",
        cost: "free",
        provider: "YouTube",
        description: "System design concepts with animations",
        rating: 4.8,
    },
    {
        title: "Designing Data-Intensive Applications",
        type: "book",
        url: "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/",
        cost: "paid",
        provider: "O'Reilly",
        description: "The definitive book on distributed systems",
        rating: 4.9,
    },
];

export const INTERVIEW_PREPARATION: LearningResource[] = [
    {
        title: "NeetCode 150",
        type: "platform",
        url: "https://neetcode.io/practice",
        cost: "free",
        provider: "NeetCode",
        description: "Curated list of 150 LeetCode problems for interviews",
        rating: 4.9,
    },
    {
        title: "Pramp",
        type: "platform",
        url: "https://www.pramp.com/",
        cost: "free",
        provider: "Pramp",
        description: "Free mock interviews with peers",
        rating: 4.6,
    },
    {
        title: "Cracking the Coding Interview",
        type: "book",
        url: "https://www.crackingthecodinginterview.com/",
        cost: "paid",
        provider: "Gayle Laakmann McDowell",
        description: "Classic interview preparation book with 189 problems",
        rating: 4.7,
    },
    {
        title: "InterviewBit",
        type: "platform",
        url: "https://www.interviewbit.com/",
        cost: "free",
        provider: "InterviewBit",
        description: "Structured coding interview preparation",
        rating: 4.5,
    },
];

export const DEVOPS_CLOUD: LearningResource[] = [
    {
        title: "Docker Mastery",
        type: "course",
        url: "https://www.udemy.com/course/docker-mastery/",
        cost: "paid",
        provider: "Udemy",
        description: "Comprehensive Docker and Kubernetes course",
        rating: 4.7,
    },
    {
        title: "AWS Certified Cloud Practitioner",
        type: "course",
        url: "https://aws.amazon.com/training/learn-about/cloud-practitioner/",
        cost: "freemium",
        provider: "AWS",
        description: "Official AWS certification preparation",
        rating: 4.6,
    },
    {
        title: "TechWorld with Nana",
        type: "youtube",
        url: "https://www.youtube.com/@TechWorldwithNana",
        cost: "free",
        provider: "YouTube",
        description: "DevOps tutorials including Docker, K8s, CI/CD",
        rating: 4.8,
    },
    {
        title: "Linux Journey",
        type: "tutorial",
        url: "https://linuxjourney.com/",
        cost: "free",
        provider: "Linux Journey",
        description: "Learn Linux from beginner to advanced",
        rating: 4.6,
    },
];

export const GIT_VERSION_CONTROL: LearningResource[] = [
    {
        title: "Git Documentation",
        type: "tutorial",
        url: "https://git-scm.com/doc",
        cost: "free",
        provider: "Git",
        description: "Official Git documentation and book",
        rating: 4.7,
    },
    {
        title: "Learn Git Branching",
        type: "tutorial",
        url: "https://learngitbranching.js.org/",
        cost: "free",
        provider: "Learn Git Branching",
        description: "Interactive Git visualization and exercises",
        rating: 4.9,
    },
    {
        title: "GitHub Skills",
        type: "course",
        url: "https://skills.github.com/",
        cost: "free",
        provider: "GitHub",
        description: "Learn GitHub with interactive courses",
        rating: 4.7,
    },
];

// Get resources for a specific topic
export function getResourcesForTopic(topic: string): LearningResource[] {
    const topicLower = topic.toLowerCase();

    if (topicLower.includes("programming") || topicLower.includes("fundamental") || topicLower.includes("basic")) {
        return PROGRAMMING_FUNDAMENTALS;
    }
    if (topicLower.includes("data structure") || topicLower.includes("algorithm") || topicLower.includes("dsa")) {
        return DATA_STRUCTURES_ALGORITHMS;
    }
    if (topicLower.includes("web") || topicLower.includes("frontend") || topicLower.includes("react") || topicLower.includes("javascript")) {
        return WEB_DEVELOPMENT;
    }
    if (topicLower.includes("python")) {
        return PYTHON_PROGRAMMING;
    }
    if (topicLower.includes("machine learning") || topicLower.includes("ml") || topicLower.includes("data science") || topicLower.includes("ai")) {
        return DATA_SCIENCE_ML;
    }
    if (topicLower.includes("system design") || topicLower.includes("architecture")) {
        return SYSTEM_DESIGN;
    }
    if (topicLower.includes("interview") || topicLower.includes("placement") || topicLower.includes("problem-solving")) {
        return INTERVIEW_PREPARATION;
    }
    if (topicLower.includes("devops") || topicLower.includes("cloud") || topicLower.includes("docker") || topicLower.includes("kubernetes")) {
        return DEVOPS_CLOUD;
    }
    if (topicLower.includes("git") || topicLower.includes("version control")) {
        return GIT_VERSION_CONTROL;
    }

    // Default to DSA if no match
    return DATA_STRUCTURES_ALGORITHMS;
}

// Get top N resources for a topic (prioritize free and high-rated)
export function getTopResources(topic: string, count: number = 3): LearningResource[] {
    const resources = getResourcesForTopic(topic);

    // Sort by: free first, then by rating
    const sorted = [...resources].sort((a, b) => {
        // Prioritize free resources
        if (a.cost === "free" && b.cost !== "free") return -1;
        if (b.cost === "free" && a.cost !== "free") return 1;

        // Then by rating
        return (b.rating || 0) - (a.rating || 0);
    });

    return sorted.slice(0, count);
}
