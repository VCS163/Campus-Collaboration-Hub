import { storage, COLLECTIONS } from './storage.js';

const INITIALISED_KEY = 'cch_initialised';
const seedDate = (daysAgo, hour = 10) => {
  const date = new Date('2026-11-02T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

const students = [
  {
    id: 'student_arjun_sharma',
    displayName: 'Arjun Sharma',
    year: 3,
    branch: 'ECE',
    bio: 'Interested in embedded systems, robotics and building useful campus tools.',
    skillsKnown: ['C', 'Embedded C', 'Arduino', 'JavaScript'],
    skillsLearning: ['React', 'PCB Design'],
    interests: ['Robotics', 'IoT', 'Open Source'],
    availabilityHours: 6,
    profileImage: '',
    createdAt: seedDate(45),
    updatedAt: seedDate(2),
  },
  {
    id: 'student_priya_nair',
    displayName: 'Priya Nair',
    year: 3,
    branch: 'CSE',
    bio: 'Enjoys Python, machine learning and helping peers learn programming.',
    skillsKnown: ['Python', 'Machine Learning', 'SQL', 'Git'],
    skillsLearning: ['MLOps', 'TypeScript'],
    interests: ['AI/ML', 'Mentoring', 'Data Science'],
    availabilityHours: 5,
    profileImage: '',
    createdAt: seedDate(52),
    updatedAt: seedDate(1),
  },
  {
    id: 'student_ravi_kumar',
    displayName: 'Ravi Kumar',
    year: 2,
    branch: 'CSE',
    bio: 'A curious beginner who likes learning by building small projects with others.',
    skillsKnown: ['Python', 'HTML', 'CSS'],
    skillsLearning: ['Data Structures', 'JavaScript'],
    interests: ['Web Development', 'Photography', 'Hackathons'],
    availabilityHours: 4,
    profileImage: '',
    createdAt: seedDate(36),
    updatedAt: seedDate(3),
  },
  {
    id: 'student_meera_patel',
    displayName: 'Meera Patel',
    year: 2,
    branch: 'ECE',
    bio: 'Interested in signal processing, design and collaborative learning.',
    skillsKnown: ['Figma', 'C', 'MATLAB'],
    skillsLearning: ['Python', 'UI Design'],
    interests: ['Design', 'Electronics', 'Campus Life'],
    availabilityHours: 5,
    profileImage: '',
    createdAt: seedDate(28),
    updatedAt: seedDate(4),
  },
];

const communities = [
  {
    id: 'community_general',
    name: 'General',
    description: 'A shared space for campus-wide questions, ideas and conversations.',
    category: 'Campus',
  },
  {
    id: 'community_ece',
    name: 'ECE',
    description: 'Electronics, communication, embedded systems and hardware discussions.',
    category: 'Department',
  },
  {
    id: 'community_cse',
    name: 'CSE',
    description: 'Computer science, programming, projects and peer support.',
    category: 'Department',
  },
  {
    id: 'community_aiml',
    name: 'AI / ML',
    description: 'Machine learning, data science, research and practical experiments.',
    category: 'Technology',
  },
  {
    id: 'community_campus_life',
    name: 'Campus Life',
    description: 'Useful campus information, activities and everyday student conversations.',
    category: 'Campus',
  },
].map((community, index) => ({ ...community, createdAt: seedDate(60 - index) }));

const learningGroups = [
  {
    id: 'learning_group_python_ml',
    mentorId: 'student_priya_nair',
    learnerIds: ['student_ravi_kumar'],
    topic: 'Python foundations for machine learning',
    status: 'active',
    createdAt: seedDate(8),
    updatedAt: seedDate(2),
  },
];

const seedData = {
  students,
  clubs: [
    {
      id: 'club_robotics_circle',
      title: 'Robotics Circle',
      description:
        'A short-term interest group for students exploring sensors, microcontrollers and small autonomous builds.',
      category: 'Technology',
      duration: '6 weeks',
      goal: 'Learn together and demonstrate one working sensor-based prototype.',
      organiserId: 'student_arjun_sharma',
      status: 'active',
      createdAt: seedDate(12),
      updatedAt: seedDate(2),
      archivedAt: null,
    },
    {
      id: 'club_photography_walks',
      title: 'Campus Photography Walks',
      description:
        'A small group that explored composition and documented campus spaces through weekly photo walks.',
      category: 'Arts',
      duration: '3 weeks',
      goal: 'Practise photography and curate a small campus photo collection.',
      organiserId: 'student_meera_patel',
      status: 'archived',
      createdAt: seedDate(32),
      updatedAt: seedDate(10),
      archivedAt: seedDate(10),
    },
  ],
  clubMemberships: [
    {
      id: 'club_membership_robotics_priya',
      clubId: 'club_robotics_circle',
      studentId: 'student_priya_nair',
      joinedAt: seedDate(9),
      createdAt: seedDate(9),
      updatedAt: seedDate(9),
    },
    {
      id: 'club_membership_robotics_ravi',
      clubId: 'club_robotics_circle',
      studentId: 'student_ravi_kumar',
      joinedAt: seedDate(7),
      createdAt: seedDate(7),
      updatedAt: seedDate(7),
    },
    {
      id: 'club_membership_robotics_meera',
      clubId: 'club_robotics_circle',
      studentId: 'student_meera_patel',
      joinedAt: seedDate(6),
      createdAt: seedDate(6),
      updatedAt: seedDate(6),
    },
    {
      id: 'club_membership_photo_arjun',
      clubId: 'club_photography_walks',
      studentId: 'student_arjun_sharma',
      joinedAt: seedDate(27),
      createdAt: seedDate(27),
      updatedAt: seedDate(27),
    },
  ],
  opportunities: [
    {
      id: 'opportunity_campus_app',
      title: 'Campus App Redesign',
      description:
        'Explore a clearer student-facing experience for discovering campus resources, activities and collaboration opportunities.',
      category: 'Campus Initiative',
      beginnerFriendly: true,
      ownerId: 'student_arjun_sharma',
      status: 'open',
      createdAt: seedDate(5),
      updatedAt: seedDate(2),
    },
    {
      id: 'opportunity_ml_study_tool',
      title: 'ML Study Tool',
      description:
        'Build a small study companion that organises machine-learning concepts and practice examples for students.',
      category: 'Project',
      beginnerFriendly: true,
      ownerId: 'student_priya_nair',
      status: 'active',
      createdAt: seedDate(14),
      updatedAt: seedDate(3),
    },
  ],
  projectRoles: [
    {
      id: 'role_campus_frontend',
      opportunityId: 'opportunity_campus_app',
      roleTitle: 'Frontend Developer',
      skills: 'HTML, CSS, JavaScript',
      description: 'Help shape the interface and implement responsive student-facing screens.',
      createdAt: seedDate(5),
    },
    {
      id: 'role_campus_ui',
      opportunityId: 'opportunity_campus_app',
      roleTitle: 'UI / UX Contributor',
      skills: 'Figma, interaction design',
      description: 'Map key student journeys and prepare clear interface flows.',
      createdAt: seedDate(5),
    },
    {
      id: 'role_ml_python',
      opportunityId: 'opportunity_ml_study_tool',
      roleTitle: 'Python Contributor',
      skills: 'Python, basic ML',
      description: 'Prepare small Python examples and help structure learning content.',
      createdAt: seedDate(13),
    },
  ],
  applications: [
    {
      id: 'application_ravi_frontend',
      opportunityId: 'opportunity_campus_app',
      roleId: 'role_campus_frontend',
      applicantId: 'student_ravi_kumar',
      pitch:
        'I want to contribute to a real student-facing app and practise building accessible, responsive interfaces.',
      skills: 'HTML, CSS, beginner JavaScript',
      learningGoals: 'Improve JavaScript and learn how a team structures a frontend project.',
      status: 'pending',
      createdAt: seedDate(1),
      updatedAt: seedDate(1),
    },
    {
      id: 'application_meera_python',
      opportunityId: 'opportunity_ml_study_tool',
      roleId: 'role_ml_python',
      applicantId: 'student_meera_patel',
      pitch:
        'I can help prepare clear examples and collaborate on the learning experience while improving my Python skills.',
      skills: 'C, MATLAB, beginner Python',
      learningGoals: 'Practise Python data handling and learn the basics of machine learning.',
      status: 'accepted',
      createdAt: seedDate(8),
      updatedAt: seedDate(6),
    },
  ],
  mentorOffers: [
    {
      id: 'mentor_offer_priya_python',
      mentorId: 'student_priya_nair',
      topics: ['Python', 'Machine Learning'],
      description:
        'Friendly peer support for Python fundamentals, data handling and first machine-learning experiments.',
      availability: 'Two evenings per week',
      maxLearners: 3,
      status: 'open',
      createdAt: seedDate(9),
      updatedAt: seedDate(2),
    },
    {
      id: 'mentor_offer_arjun_web',
      mentorId: 'student_arjun_sharma',
      topics: ['HTML', 'CSS', 'JavaScript'],
      description:
        'Practical help getting started with browser fundamentals and small web interfaces.',
      availability: 'Weekend afternoons',
      maxLearners: 2,
      status: 'open',
      createdAt: seedDate(7),
      updatedAt: seedDate(3),
    },
  ],
  learningRequests: [
    {
      id: 'learning_request_ravi_python',
      requesterId: 'student_ravi_kumar',
      topic: 'Python for data analysis',
      goal: 'Learn enough Python data handling to build a small end-to-end machine-learning exercise.',
      mode: 'one-on-one',
      status: 'open',
      createdAt: seedDate(6),
      updatedAt: seedDate(2),
    },
    {
      id: 'learning_request_meera_embedded',
      requesterId: 'student_meera_patel',
      topic: 'Embedded C fundamentals',
      goal: 'Become more confident writing structured firmware for a microcontroller-based mini project.',
      mode: 'group',
      status: 'open',
      createdAt: seedDate(3),
      updatedAt: seedDate(1),
    },
  ],
  mentorshipRequests: [
    {
      id: 'mentorship_request_ravi_priya',
      learnerId: 'student_ravi_kumar',
      mentorId: 'student_priya_nair',
      offerId: 'mentor_offer_priya_python',
      groupId: 'learning_group_python_ml',
      message:
        'I would like guidance as I work through Python data handling and my first ML exercise.',
      status: 'accepted',
      createdAt: seedDate(5),
      updatedAt: seedDate(4),
    },
  ],
  learningGroups,
  learningMilestones: [
    {
      id: 'milestone_python_basics',
      groupId: 'learning_group_python_ml',
      title: 'Review Python data types and functions',
      completed: true,
      createdAt: seedDate(6),
      updatedAt: seedDate(3),
    },
    {
      id: 'milestone_first_dataset',
      groupId: 'learning_group_python_ml',
      title: 'Load and inspect a small dataset',
      completed: false,
      createdAt: seedDate(2),
      updatedAt: seedDate(2),
    },
  ],
  communities,
  posts: [
    {
      id: 'post_ece_embedded',
      communityId: 'community_ece',
      authorId: 'student_arjun_sharma',
      type: 'discussion',
      title: 'What are you building with microcontrollers this semester?',
      body: 'I am exploring a sensor-based prototype and would love to hear what others are experimenting with. Share your board, sensors or lessons learned.',
      createdAt: seedDate(1, 9),
      updatedAt: seedDate(1, 9),
    },
    {
      id: 'post_aiml_resources',
      communityId: 'community_aiml',
      authorId: 'student_priya_nair',
      type: 'resource',
      title: 'A simple path for your first machine-learning project',
      body: 'Start with a small, clean dataset, establish a baseline and write down what each metric means. What helped you get started?',
      createdAt: seedDate(2, 11),
      updatedAt: seedDate(2, 11),
    },
    {
      id: 'post_cse_hackathon',
      communityId: 'community_cse',
      authorId: 'student_ravi_kumar',
      type: 'question',
      title: 'How do you find teammates for a first hackathon?',
      body: 'I want to participate in my first hackathon. What should I prepare before approaching potential teammates?',
      createdAt: seedDate(3, 14),
      updatedAt: seedDate(3, 14),
    },
    {
      id: 'post_general_study',
      communityId: 'community_general',
      authorId: 'student_meera_patel',
      type: 'discussion',
      title: 'Good quiet places for a focused study session?',
      body: 'Looking for calm places on campus where a small group can work together without disturbing others.',
      createdAt: seedDate(4, 8),
      updatedAt: seedDate(4, 8),
    },
  ],
  comments: [
    {
      id: 'comment_embedded_priya',
      postId: 'post_ece_embedded',
      authorId: 'student_priya_nair',
      body: 'I have been experimenting with a small Python dashboard to visualise sensor readings. Happy to compare notes.',
      createdAt: seedDate(1, 12),
    },
    {
      id: 'comment_hackathon_arjun',
      postId: 'post_cse_hackathon',
      authorId: 'student_arjun_sharma',
      body: 'Start by listing the skills you want to practise and a realistic amount of time you can commit.',
      createdAt: seedDate(2, 9),
    },
    {
      id: 'comment_study_ravi',
      postId: 'post_general_study',
      authorId: 'student_ravi_kumar',
      body: 'The library discussion area has worked well for our small study group.',
      createdAt: seedDate(2, 15),
    },
  ],
  reactions: [
    {
      id: 'reaction_priya_embedded',
      postId: 'post_ece_embedded',
      studentId: 'student_priya_nair',
      createdAt: seedDate(1, 13),
    },
    {
      id: 'reaction_meera_resources',
      postId: 'post_aiml_resources',
      studentId: 'student_meera_patel',
      createdAt: seedDate(1, 16),
    },
  ],
};

export function initialise() {
  try {
    const alreadyInitialised = globalThis.localStorage?.getItem(INITIALISED_KEY) === 'true';
    if (alreadyInitialised) return { inserted: 0, skipped: true };

    let inserted = 0;
    for (const collection of COLLECTIONS) {
      const records = seedData[collection] ?? [];
      for (const record of records) {
        if (!storage.getById(collection, record.id)) {
          storage.insert(collection, record);
          inserted += 1;
        }
      }
    }

    globalThis.localStorage.setItem(INITIALISED_KEY, 'true');
    return { inserted, skipped: false };
  } catch (error) {
    console.error('Seed data initialisation failed:', error);
    throw error;
  }
}

storage.registerSeedInitializer(initialise);

export const seed = Object.freeze({ initialise });

export function getSeedSummary() {
  return Object.fromEntries(
    COLLECTIONS.map((collection) => [collection, seedData[collection]?.length ?? 0]),
  );
}
