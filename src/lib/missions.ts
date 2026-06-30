export type MissionTrack = "workplace";

export type MissionLevel = "A1" | "A2" | "B1" | "B2";

export type MissionStep =
  | "prepare"
  | "drill"
  | "roleplay"
  | "feedback"
  | "retry"
  | "review";

export type SpeakingRubricKey =
  | "taskCompletion"
  | "fluency"
  | "accuracy"
  | "vocabulary"
  | "interaction";

export type MissionChunk = {
  text: string;
  meaningVi: string;
  example: string;
};

export type MissionVocabularyItem = {
  word: string;
  meaningVi: string;
  example: string;
};

export type MissionRubricItem = {
  key: SpeakingRubricKey;
  label: string;
  guidance: string;
};

export type SpeakingMission = {
  id: string;
  dayNumber: number;
  weekNumber: number;
  level: MissionLevel;
  track: MissionTrack;
  title: string;
  goal: string;
  scenario: string;
  estimatedMinutes: number;
  steps: MissionStep[];
  targetChunks: MissionChunk[];
  targetVocabulary: MissionVocabularyItem[];
  practiceQuestions: string[];
  roleplayPrompt: string;
  rubric: MissionRubricItem[];
};

export type MissionLookupOptions = {
  track?: MissionTrack;
};

export const defaultSpeakingRubric: MissionRubricItem[] = [
  {
    key: "taskCompletion",
    label: "Task completion",
    guidance: "Did the learner answer the mission goal clearly enough?",
  },
  {
    key: "fluency",
    label: "Fluency",
    guidance: "Did the answer connect ideas without stopping too early?",
  },
  {
    key: "accuracy",
    label: "Accuracy",
    guidance: "Did the learner use correct sentence structure and collocations?",
  },
  {
    key: "vocabulary",
    label: "Vocabulary",
    guidance: "Did the learner use the target chunks and useful workplace words?",
  },
  {
    key: "interaction",
    label: "Interaction",
    guidance: "Did the learner ask, clarify, confirm, or extend the conversation?",
  },
];

const defaultMissionSteps: MissionStep[] = [
  "prepare",
  "drill",
  "roleplay",
  "feedback",
  "retry",
  "review",
];

export const sevenDayMissionPath: SpeakingMission[] = [
  {
    id: "workplace-day-01-introduce-yourself",
    dayNumber: 1,
    weekNumber: 1,
    level: "A2",
    track: "workplace",
    title: "Introduce yourself",
    goal: "Introduce who you are, what you do, and one thing you are working on.",
    scenario: "You meet a new teammate on their first day.",
    estimatedMinutes: 20,
    steps: defaultMissionSteps,
    targetChunks: [
      {
        text: "I'm responsible for...",
        meaningVi: "toi phu trach...",
        example: "I'm responsible for building the dashboard.",
      },
      {
        text: "I mainly work on...",
        meaningVi: "toi chu yeu lam ve...",
        example: "I mainly work on backend features.",
      },
      {
        text: "Right now, I'm focusing on...",
        meaningVi: "hien tai toi dang tap trung vao...",
        example: "Right now, I'm focusing on fixing login issues.",
      },
    ],
    targetVocabulary: [
      {
        word: "responsible",
        meaningVi: "phu trach",
        example: "I'm responsible for testing the new feature.",
      },
      {
        word: "feature",
        meaningVi: "tinh nang",
        example: "This feature helps users track progress.",
      },
      {
        word: "team",
        meaningVi: "doi nhom",
        example: "I work with a small product team.",
      },
    ],
    practiceQuestions: [
      "What is your role?",
      "What do you mainly work on?",
      "What are you focusing on right now?",
    ],
    roleplayPrompt:
      "Act as a friendly new teammate. Ask the learner to introduce themself, then ask one follow-up question about their current work.",
    rubric: defaultSpeakingRubric,
  },
  {
    id: "workplace-day-02-describe-your-job",
    dayNumber: 2,
    weekNumber: 1,
    level: "A2",
    track: "workplace",
    title: "Describe your job",
    goal: "Describe your job responsibilities in simple, clear English.",
    scenario: "A non-technical colleague asks what your job is like.",
    estimatedMinutes: 20,
    steps: defaultMissionSteps,
    targetChunks: [
      {
        text: "My role involves...",
        meaningVi: "vai tro cua toi bao gom...",
        example: "My role involves writing code and reviewing pull requests.",
      },
      {
        text: "I usually...",
        meaningVi: "toi thuong...",
        example: "I usually check requirements before I start coding.",
      },
      {
        text: "I work closely with...",
        meaningVi: "toi lam viec chat che voi...",
        example: "I work closely with designers and product managers.",
      },
    ],
    targetVocabulary: [
      {
        word: "requirement",
        meaningVi: "yeu cau",
        example: "I need to understand the requirement first.",
      },
      {
        word: "review",
        meaningVi: "xem lai, danh gia",
        example: "I review code before it is merged.",
      },
      {
        word: "collaborate",
        meaningVi: "cong tac",
        example: "I collaborate with the design team.",
      },
    ],
    practiceQuestions: [
      "What does your role involve?",
      "Who do you work closely with?",
      "What do you usually do before starting a task?",
    ],
    roleplayPrompt:
      "Act as a non-technical colleague. Ask the learner to explain their job in plain English, then ask for one concrete example.",
    rubric: defaultSpeakingRubric,
  },
  {
    id: "workplace-day-03-talk-about-routine",
    dayNumber: 3,
    weekNumber: 1,
    level: "A2",
    track: "workplace",
    title: "Talk about your routine",
    goal: "Talk about your daily work routine using simple sequence words.",
    scenario: "You have small talk with a coworker about a normal workday.",
    estimatedMinutes: 20,
    steps: defaultMissionSteps,
    targetChunks: [
      {
        text: "Every day, I...",
        meaningVi: "moi ngay toi...",
        example: "Every day, I check my tasks and messages.",
      },
      {
        text: "I usually start by...",
        meaningVi: "toi thuong bat dau bang viec...",
        example: "I usually start by reviewing priorities.",
      },
      {
        text: "After that, I...",
        meaningVi: "sau do toi...",
        example: "After that, I join the daily meeting.",
      },
    ],
    targetVocabulary: [
      {
        word: "routine",
        meaningVi: "thoi quen hang ngay",
        example: "My morning routine is simple.",
      },
      {
        word: "priority",
        meaningVi: "uu tien",
        example: "I check my top priority first.",
      },
      {
        word: "standup",
        meaningVi: "cuoc hop ngan hang ngay",
        example: "We have a standup every morning.",
      },
    ],
    practiceQuestions: [
      "How do you usually start your workday?",
      "What do you do after your daily meeting?",
      "What is one important part of your routine?",
    ],
    roleplayPrompt:
      "Act as a coworker making small talk. Ask about the learner's workday routine and respond naturally with one follow-up question.",
    rubric: defaultSpeakingRubric,
  },
  {
    id: "workplace-day-04-ask-for-clarification",
    dayNumber: 4,
    weekNumber: 1,
    level: "A2",
    track: "workplace",
    title: "Ask for clarification",
    goal: "Ask polite clarification questions when a request is unclear.",
    scenario: "A teammate gives you an unclear task requirement.",
    estimatedMinutes: 20,
    steps: defaultMissionSteps,
    targetChunks: [
      {
        text: "Could you clarify...?",
        meaningVi: "ban co the lam ro...?",
        example: "Could you clarify the expected result?",
      },
      {
        text: "Do you mean...?",
        meaningVi: "y ban la...?",
        example: "Do you mean the mobile layout or desktop layout?",
      },
      {
        text: "Just to confirm...",
        meaningVi: "de xac nhan lai...",
        example: "Just to confirm, this should be done by Friday, right?",
      },
    ],
    targetVocabulary: [
      {
        word: "clarify",
        meaningVi: "lam ro",
        example: "Could you clarify the requirement?",
      },
      {
        word: "expected",
        meaningVi: "duoc mong doi",
        example: "What is the expected behavior?",
      },
      {
        word: "confirm",
        meaningVi: "xac nhan",
        example: "I want to confirm the deadline.",
      },
    ],
    practiceQuestions: [
      "What can you say when a requirement is unclear?",
      "How do you confirm a deadline?",
      "How do you ask about the expected result?",
    ],
    roleplayPrompt:
      "Act as a teammate giving a vague task. Let the learner ask clarification questions, then answer briefly.",
    rubric: defaultSpeakingRubric,
  },
  {
    id: "workplace-day-05-explain-a-problem",
    dayNumber: 5,
    weekNumber: 1,
    level: "A2",
    track: "workplace",
    title: "Explain a problem",
    goal: "Explain a blocker or problem clearly and ask for help.",
    scenario: "You report a blocker during a daily standup.",
    estimatedMinutes: 20,
    steps: defaultMissionSteps,
    targetChunks: [
      {
        text: "The main issue is...",
        meaningVi: "van de chinh la...",
        example: "The main issue is that the API returns an error.",
      },
      {
        text: "I'm blocked by...",
        meaningVi: "toi dang bi chan boi...",
        example: "I'm blocked by missing test data.",
      },
      {
        text: "I need help with...",
        meaningVi: "toi can ho tro ve...",
        example: "I need help with reproducing the bug.",
      },
    ],
    targetVocabulary: [
      {
        word: "blocker",
        meaningVi: "tro ngai dang chan tien do",
        example: "The missing API key is a blocker.",
      },
      {
        word: "issue",
        meaningVi: "van de",
        example: "There is an issue with the login page.",
      },
      {
        word: "reproduce",
        meaningVi: "tai hien loi",
        example: "I cannot reproduce the bug locally.",
      },
    ],
    practiceQuestions: [
      "What is the main issue?",
      "What are you blocked by?",
      "What help do you need?",
    ],
    roleplayPrompt:
      "Act as a team lead in a daily standup. Ask what the learner worked on, what the blocker is, and what help they need.",
    rubric: defaultSpeakingRubric,
  },
  {
    id: "workplace-day-06-give-an-opinion",
    dayNumber: 6,
    weekNumber: 1,
    level: "A2",
    track: "workplace",
    title: "Give an opinion",
    goal: "Give a short workplace opinion and support it with one reason.",
    scenario: "Your team discusses a product or technical decision.",
    estimatedMinutes: 20,
    steps: defaultMissionSteps,
    targetChunks: [
      {
        text: "I think we should...",
        meaningVi: "toi nghi chung ta nen...",
        example: "I think we should keep the first version simple.",
      },
      {
        text: "In my opinion...",
        meaningVi: "theo y kien cua toi...",
        example: "In my opinion, this option is easier to maintain.",
      },
      {
        text: "The main reason is...",
        meaningVi: "ly do chinh la...",
        example: "The main reason is that it reduces risk.",
      },
    ],
    targetVocabulary: [
      {
        word: "option",
        meaningVi: "lua chon",
        example: "This option is faster to build.",
      },
      {
        word: "maintain",
        meaningVi: "bao tri",
        example: "This code is easier to maintain.",
      },
      {
        word: "risk",
        meaningVi: "rui ro",
        example: "We should reduce risk in the first release.",
      },
    ],
    practiceQuestions: [
      "What option do you prefer?",
      "Why do you think that option is better?",
      "What is one risk we should avoid?",
    ],
    roleplayPrompt:
      "Act as a product teammate. Ask the learner for their opinion about keeping a feature simple or adding more options.",
    rubric: defaultSpeakingRubric,
  },
  {
    id: "workplace-day-07-review-and-mini-assessment",
    dayNumber: 7,
    weekNumber: 1,
    level: "A2",
    track: "workplace",
    title: "Review and mini assessment",
    goal: "Review the week and give a longer answer about your work, routine, and challenges.",
    scenario: "Your coach asks you to summarize what you learned this week.",
    estimatedMinutes: 25,
    steps: defaultMissionSteps,
    targetChunks: [
      {
        text: "This week, I learned how to...",
        meaningVi: "tuan nay toi da hoc cach...",
        example: "This week, I learned how to explain blockers.",
      },
      {
        text: "I still need to improve...",
        meaningVi: "toi van can cai thien...",
        example: "I still need to improve my fluency.",
      },
      {
        text: "Next week, I want to...",
        meaningVi: "tuan toi toi muon...",
        example: "Next week, I want to speak with more confidence.",
      },
    ],
    targetVocabulary: [
      {
        word: "improve",
        meaningVi: "cai thien",
        example: "I want to improve my speaking speed.",
      },
      {
        word: "confidence",
        meaningVi: "su tu tin",
        example: "I need more confidence in meetings.",
      },
      {
        word: "progress",
        meaningVi: "tien bo",
        example: "I can see some progress this week.",
      },
    ],
    practiceQuestions: [
      "What did you learn this week?",
      "What was difficult for you?",
      "What do you want to improve next week?",
    ],
    roleplayPrompt:
      "Act as a supportive speaking coach. Ask the learner to review their week, mention one strength, and choose one area to improve.",
    rubric: defaultSpeakingRubric,
  },
];

type WorkplaceMissionSeed = Omit<SpeakingMission, "track" | "steps" | "rubric">;

function createWorkplaceMission(seed: WorkplaceMissionSeed): SpeakingMission {
  return {
    ...seed,
    track: "workplace",
    steps: defaultMissionSteps,
    rubric: defaultSpeakingRubric,
  };
}

const expandedWorkplaceMissionPath: SpeakingMission[] = [
  createWorkplaceMission({
    id: "workplace-day-08-small-talk-opener",
    dayNumber: 8,
    weekNumber: 2,
    level: "A2",
    title: "Start small talk",
    goal: "Start a short workplace small-talk exchange and ask one friendly follow-up.",
    scenario: "You meet a colleague before a meeting starts.",
    estimatedMinutes: 20,
    targetChunks: [
      {
        text: "How is your day going?",
        meaningVi: "hom nay cua ban the nao",
        example: "How is your day going so far?",
      },
      {
        text: "Did you get a chance to...?",
        meaningVi: "ban da co dip... chua",
        example: "Did you get a chance to review the design?",
      },
      {
        text: "That sounds...",
        meaningVi: "nghe co ve...",
        example: "That sounds useful for the team.",
      },
    ],
    targetVocabulary: [
      { word: "chance", meaningVi: "co hoi, dip", example: "Did you get a chance to check it?" },
      { word: "quick", meaningVi: "nhanh", example: "Can we have a quick chat?" },
      { word: "busy", meaningVi: "ban", example: "It has been a busy morning." },
    ],
    practiceQuestions: [
      "How can you start small talk before a meeting?",
      "What follow-up question can you ask?",
      "How do you respond to a colleague's update?",
    ],
    roleplayPrompt:
      "Act as a colleague waiting for a meeting. Let the learner start small talk and ask one follow-up question.",
  }),
  createWorkplaceMission({
    id: "workplace-day-09-share-a-status-update",
    dayNumber: 9,
    weekNumber: 2,
    level: "A2",
    title: "Share a status update",
    goal: "Give a short update about what is done, in progress, and next.",
    scenario: "Your teammate asks for a quick project status.",
    estimatedMinutes: 20,
    targetChunks: [
      {
        text: "So far, I have...",
        meaningVi: "cho den hien tai toi da...",
        example: "So far, I have finished the login screen.",
      },
      {
        text: "I'm currently working on...",
        meaningVi: "hien tai toi dang lam...",
        example: "I'm currently working on the API connection.",
      },
      {
        text: "Next, I will...",
        meaningVi: "tiep theo toi se...",
        example: "Next, I will test the error states.",
      },
    ],
    targetVocabulary: [
      { word: "status", meaningVi: "trang thai", example: "Here is the current status." },
      { word: "in progress", meaningVi: "dang tien hanh", example: "The task is still in progress." },
      { word: "next", meaningVi: "tiep theo", example: "Next, I will update the docs." },
    ],
    practiceQuestions: [
      "What have you finished so far?",
      "What are you currently working on?",
      "What will you do next?",
    ],
    roleplayPrompt:
      "Act as a teammate asking for a quick status update. Ask what is done, what is in progress, and what is next.",
  }),
  createWorkplaceMission({
    id: "workplace-day-10-describe-progress",
    dayNumber: 10,
    weekNumber: 2,
    level: "A2",
    title: "Describe progress",
    goal: "Explain progress with simple numbers, blockers, and confidence level.",
    scenario: "Your team lead asks how close your task is to completion.",
    estimatedMinutes: 20,
    targetChunks: [
      {
        text: "I'm about... percent done.",
        meaningVi: "toi da hoan thanh khoang... phan tram",
        example: "I'm about seventy percent done.",
      },
      {
        text: "The remaining part is...",
        meaningVi: "phan con lai la...",
        example: "The remaining part is testing the retry flow.",
      },
      {
        text: "I feel confident because...",
        meaningVi: "toi thay tu tin vi...",
        example: "I feel confident because the main feature is working.",
      },
    ],
    targetVocabulary: [
      { word: "remaining", meaningVi: "con lai", example: "The remaining work is small." },
      { word: "estimate", meaningVi: "uoc tinh", example: "My estimate is two hours." },
      { word: "confident", meaningVi: "tu tin", example: "I am confident about this timeline." },
    ],
    practiceQuestions: [
      "How much progress have you made?",
      "What is the remaining part?",
      "How confident are you about the timeline?",
    ],
    roleplayPrompt:
      "Act as a team lead asking for progress. Ask about percentage done, remaining work, and confidence.",
  }),
  createWorkplaceMission({
    id: "workplace-day-11-ask-for-help",
    dayNumber: 11,
    weekNumber: 2,
    level: "A2",
    title: "Ask for help",
    goal: "Ask for help clearly without sounding passive or vague.",
    scenario: "You need help from a teammate to unblock your task.",
    estimatedMinutes: 20,
    targetChunks: [
      {
        text: "Could you help me with...?",
        meaningVi: "ban co the giup toi ve... khong",
        example: "Could you help me with the test data?",
      },
      {
        text: "I'm not sure how to...",
        meaningVi: "toi chua chac cach...",
        example: "I'm not sure how to reproduce this issue.",
      },
      {
        text: "It would help if...",
        meaningVi: "se huu ich neu...",
        example: "It would help if you could share an example request.",
      },
    ],
    targetVocabulary: [
      { word: "unblock", meaningVi: "go chan, thao go", example: "This will unblock my task." },
      { word: "example", meaningVi: "vi du", example: "Can you share an example?" },
      { word: "request", meaningVi: "yeu cau", example: "The request is missing a field." },
    ],
    practiceQuestions: [
      "What help do you need?",
      "What are you not sure how to do?",
      "What would help you move forward?",
    ],
    roleplayPrompt:
      "Act as a teammate. Let the learner ask for help, then ask one follow-up about what they already tried.",
  }),
  createWorkplaceMission({
    id: "workplace-day-12-answer-follow-up-questions",
    dayNumber: 12,
    weekNumber: 2,
    level: "A2",
    title: "Answer follow-up questions",
    goal: "Answer a follow-up question with context, detail, and a short check-back.",
    scenario: "A teammate asks follow-up questions after your update.",
    estimatedMinutes: 20,
    targetChunks: [
      {
        text: "The reason is...",
        meaningVi: "ly do la...",
        example: "The reason is that the API changed.",
      },
      {
        text: "For example...",
        meaningVi: "vi du...",
        example: "For example, the mobile layout breaks on small screens.",
      },
      {
        text: "Does that answer your question?",
        meaningVi: "dieu do co tra loi cau hoi cua ban khong",
        example: "Does that answer your question?",
      },
    ],
    targetVocabulary: [
      { word: "context", meaningVi: "boi canh", example: "Let me give some context." },
      { word: "detail", meaningVi: "chi tiet", example: "Can you add one detail?" },
      { word: "follow-up", meaningVi: "cau hoi tiep theo", example: "I have one follow-up question." },
    ],
    practiceQuestions: [
      "How do you explain the reason?",
      "What example can you give?",
      "How do you check if your answer is clear?",
    ],
    roleplayPrompt:
      "Act as a teammate asking follow-up questions. Ask why, ask for an example, and let the learner check understanding.",
  }),
  createWorkplaceMission({
    id: "workplace-day-13-summarize-a-meeting",
    dayNumber: 13,
    weekNumber: 2,
    level: "A2",
    title: "Summarize a meeting",
    goal: "Summarize a short meeting with decisions and next steps.",
    scenario: "A colleague missed a meeting and asks what happened.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "The main point was...",
        meaningVi: "y chinh la...",
        example: "The main point was that we should simplify the first release.",
      },
      {
        text: "We decided to...",
        meaningVi: "chung toi da quyet dinh...",
        example: "We decided to move the deadline to Friday.",
      },
      {
        text: "The next step is...",
        meaningVi: "buoc tiep theo la...",
        example: "The next step is to update the task list.",
      },
    ],
    targetVocabulary: [
      { word: "decision", meaningVi: "quyet dinh", example: "The decision is final." },
      { word: "action item", meaningVi: "viec can lam", example: "I have one action item." },
      { word: "deadline", meaningVi: "han chot", example: "The deadline is Friday." },
    ],
    practiceQuestions: [
      "What was the main point?",
      "What did the team decide?",
      "What is the next step?",
    ],
    roleplayPrompt:
      "Act as a colleague who missed the meeting. Ask the learner to summarize the main point, decision, and next step.",
  }),
  createWorkplaceMission({
    id: "workplace-day-14-week-2-review",
    dayNumber: 14,
    weekNumber: 2,
    level: "A2",
    title: "Week 2 interaction review",
    goal: "Review workplace interaction skills from small talk to meeting summary.",
    scenario: "Your speaking coach reviews your interaction skills for the week.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "This week, I practiced...",
        meaningVi: "tuan nay toi da luyen...",
        example: "This week, I practiced asking for help.",
      },
      {
        text: "The hardest part was...",
        meaningVi: "phan kho nhat la...",
        example: "The hardest part was answering follow-up questions.",
      },
      {
        text: "Next, I need to...",
        meaningVi: "tiep theo toi can...",
        example: "Next, I need to speak more naturally.",
      },
    ],
    targetVocabulary: [
      { word: "interaction", meaningVi: "tuong tac", example: "Interaction is important in meetings." },
      { word: "natural", meaningVi: "tu nhien", example: "I want to sound more natural." },
      { word: "review", meaningVi: "on lai", example: "This is my weekly review." },
    ],
    practiceQuestions: [
      "What did you practice this week?",
      "What was the hardest interaction task?",
      "What will you improve next?",
    ],
    roleplayPrompt:
      "Act as a speaking coach. Ask the learner to review week two and choose one interaction skill to improve.",
  }),
  createWorkplaceMission({
    id: "workplace-day-15-propose-a-solution",
    dayNumber: 15,
    weekNumber: 3,
    level: "B1",
    title: "Propose a solution",
    goal: "Suggest a practical solution and explain why it helps.",
    scenario: "Your team discusses how to fix a recurring problem.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "One possible solution is...",
        meaningVi: "mot giai phap co the la...",
        example: "One possible solution is to add validation earlier.",
      },
      {
        text: "This would help because...",
        meaningVi: "dieu nay se huu ich vi...",
        example: "This would help because users get feedback faster.",
      },
      {
        text: "We could start by...",
        meaningVi: "chung ta co the bat dau bang...",
        example: "We could start by testing it with one user group.",
      },
    ],
    targetVocabulary: [
      { word: "solution", meaningVi: "giai phap", example: "This solution is simple." },
      { word: "validate", meaningVi: "kiem tra hop le", example: "We should validate the input." },
      { word: "impact", meaningVi: "tac dong", example: "The impact is small but useful." },
    ],
    practiceQuestions: [
      "What solution do you propose?",
      "Why would it help?",
      "How could the team start?",
    ],
    roleplayPrompt:
      "Act as a teammate discussing a recurring problem. Ask the learner to propose a solution and defend it briefly.",
  }),
  createWorkplaceMission({
    id: "workplace-day-16-compare-options",
    dayNumber: 16,
    weekNumber: 3,
    level: "B1",
    title: "Compare options",
    goal: "Compare two options using benefits, risks, and a recommendation.",
    scenario: "Your team chooses between two implementation options.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "Option A is better for...",
        meaningVi: "lua chon A tot hon cho...",
        example: "Option A is better for speed.",
      },
      {
        text: "The trade-off is...",
        meaningVi: "su danh doi la...",
        example: "The trade-off is that it is harder to maintain.",
      },
      {
        text: "I would recommend...",
        meaningVi: "toi se de xuat...",
        example: "I would recommend Option B for the first release.",
      },
    ],
    targetVocabulary: [
      { word: "trade-off", meaningVi: "su danh doi", example: "There is a trade-off between speed and quality." },
      { word: "benefit", meaningVi: "loi ich", example: "The main benefit is lower risk." },
      { word: "recommend", meaningVi: "de xuat", example: "I recommend the simpler option." },
    ],
    practiceQuestions: [
      "What are the two options?",
      "What is the trade-off?",
      "Which option do you recommend?",
    ],
    roleplayPrompt:
      "Act as a product teammate comparing two options. Ask the learner to explain benefits, risks, and a recommendation.",
  }),
  createWorkplaceMission({
    id: "workplace-day-17-negotiate-priority",
    dayNumber: 17,
    weekNumber: 3,
    level: "B1",
    title: "Negotiate priority",
    goal: "Discuss priority when there is too much work and limited time.",
    scenario: "A manager asks you to take another urgent task.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "I can take this on, but...",
        meaningVi: "toi co the nhan viec nay nhung...",
        example: "I can take this on, but the current task will be delayed.",
      },
      {
        text: "Which one should I prioritize?",
        meaningVi: "toi nen uu tien viec nao",
        example: "Which one should I prioritize today?",
      },
      {
        text: "If this is urgent, I can...",
        meaningVi: "neu viec nay gap, toi co the...",
        example: "If this is urgent, I can move the bug fix to tomorrow.",
      },
    ],
    targetVocabulary: [
      { word: "urgent", meaningVi: "gap", example: "This request is urgent." },
      { word: "prioritize", meaningVi: "uu tien", example: "We need to prioritize the release bug." },
      { word: "delay", meaningVi: "tri hoan", example: "This may delay the current task." },
    ],
    practiceQuestions: [
      "How do you respond to a new urgent task?",
      "What question can you ask about priority?",
      "What trade-off should you mention?",
    ],
    roleplayPrompt:
      "Act as a manager giving the learner a new urgent task. Let the learner negotiate priority politely.",
  }),
  createWorkplaceMission({
    id: "workplace-day-18-disagree-politely",
    dayNumber: 18,
    weekNumber: 3,
    level: "B1",
    title: "Disagree politely",
    goal: "Disagree with a proposal while keeping the conversation constructive.",
    scenario: "A teammate suggests an approach you think is risky.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "I see your point, but...",
        meaningVi: "toi hieu y ban nhung...",
        example: "I see your point, but this may create more bugs.",
      },
      {
        text: "My concern is...",
        meaningVi: "dieu toi lo la...",
        example: "My concern is that the timeline is too tight.",
      },
      {
        text: "Could we consider...?",
        meaningVi: "chung ta co the can nhac... khong",
        example: "Could we consider a smaller first version?",
      },
    ],
    targetVocabulary: [
      { word: "concern", meaningVi: "moi lo", example: "My concern is the release date." },
      { word: "constructive", meaningVi: "mang tinh xay dung", example: "Let's keep the feedback constructive." },
      { word: "risky", meaningVi: "rui ro", example: "This approach feels risky." },
    ],
    practiceQuestions: [
      "How do you acknowledge the other person's point?",
      "What concern do you have?",
      "What alternative can you suggest?",
    ],
    roleplayPrompt:
      "Act as a teammate proposing a risky idea. Let the learner disagree politely and suggest an alternative.",
  }),
  createWorkplaceMission({
    id: "workplace-day-19-explain-data",
    dayNumber: 19,
    weekNumber: 3,
    level: "B1",
    title: "Explain data",
    goal: "Explain a simple metric, what changed, and what it means.",
    scenario: "You present a small metric change in a team update.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "The number increased from... to...",
        meaningVi: "con so tang tu... len...",
        example: "The number increased from ten to fifteen percent.",
      },
      {
        text: "This suggests that...",
        meaningVi: "dieu nay cho thay rang...",
        example: "This suggests that users understand the flow better.",
      },
      {
        text: "We should keep an eye on...",
        meaningVi: "chung ta nen theo doi...",
        example: "We should keep an eye on the error rate.",
      },
    ],
    targetVocabulary: [
      { word: "metric", meaningVi: "chi so", example: "This metric improved last week." },
      { word: "increase", meaningVi: "tang", example: "Signups increased this week." },
      { word: "trend", meaningVi: "xu huong", example: "The trend looks positive." },
    ],
    practiceQuestions: [
      "What metric changed?",
      "What does the change suggest?",
      "What should the team monitor next?",
    ],
    roleplayPrompt:
      "Act as a team lead asking about a metric. Ask the learner to explain the number, meaning, and next monitoring step.",
  }),
  createWorkplaceMission({
    id: "workplace-day-20-handle-user-issue",
    dayNumber: 20,
    weekNumber: 3,
    level: "B1",
    title: "Handle a user issue",
    goal: "Explain a user issue and suggest a calm next step.",
    scenario: "A support teammate reports that users are stuck.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "Users are having trouble with...",
        meaningVi: "nguoi dung dang gap kho khan voi...",
        example: "Users are having trouble with password reset.",
      },
      {
        text: "The issue seems to be...",
        meaningVi: "van de co ve la...",
        example: "The issue seems to be an expired link.",
      },
      {
        text: "A good next step is...",
        meaningVi: "buoc tiep theo tot la...",
        example: "A good next step is to check the logs.",
      },
    ],
    targetVocabulary: [
      { word: "support", meaningVi: "ho tro", example: "The support team reported this issue." },
      { word: "stuck", meaningVi: "bi ket", example: "Users are stuck on the login page." },
      { word: "logs", meaningVi: "nhat ky he thong", example: "We should check the logs." },
    ],
    practiceQuestions: [
      "What problem are users having?",
      "What does the issue seem to be?",
      "What is a good next step?",
    ],
    roleplayPrompt:
      "Act as a support teammate reporting a user issue. Ask the learner to explain the issue and suggest the next step.",
  }),
  createWorkplaceMission({
    id: "workplace-day-21-week-3-review",
    dayNumber: 21,
    weekNumber: 3,
    level: "B1",
    title: "Week 3 collaboration review",
    goal: "Review solution, priority, disagreement, and data explanation skills.",
    scenario: "Your coach asks you to reflect on collaboration conversations.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "I learned to handle...",
        meaningVi: "toi da hoc cach xu ly...",
        example: "I learned to handle disagreement more politely.",
      },
      {
        text: "I need more practice with...",
        meaningVi: "toi can luyen them ve...",
        example: "I need more practice with explaining data.",
      },
      {
        text: "My next focus is...",
        meaningVi: "trong tam tiep theo cua toi la...",
        example: "My next focus is interaction.",
      },
    ],
    targetVocabulary: [
      { word: "collaboration", meaningVi: "cong tac", example: "Collaboration requires clear communication." },
      { word: "reflect", meaningVi: "nhin lai", example: "I want to reflect on my weak points." },
      { word: "focus", meaningVi: "trong tam", example: "My focus is fluency." },
    ],
    practiceQuestions: [
      "What collaboration skill did you practice?",
      "What still feels difficult?",
      "What is your next focus?",
    ],
    roleplayPrompt:
      "Act as a speaking coach reviewing week three. Ask the learner to reflect on collaboration and choose a next focus.",
  }),
  createWorkplaceMission({
    id: "workplace-day-22-tell-a-project-story",
    dayNumber: 22,
    weekNumber: 4,
    level: "B1",
    title: "Tell a project story",
    goal: "Tell a short story about a project using situation, action, and result.",
    scenario: "A colleague asks about a project you are proud of.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "The situation was...",
        meaningVi: "tinh huong la...",
        example: "The situation was that users could not finish onboarding.",
      },
      {
        text: "What I did was...",
        meaningVi: "viec toi da lam la...",
        example: "What I did was simplify the steps.",
      },
      {
        text: "As a result...",
        meaningVi: "ket qua la...",
        example: "As a result, more users completed the flow.",
      },
    ],
    targetVocabulary: [
      { word: "onboarding", meaningVi: "qua trinh bat dau dung san pham", example: "The onboarding flow was too long." },
      { word: "result", meaningVi: "ket qua", example: "The result was positive." },
      { word: "proud", meaningVi: "tu hao", example: "I am proud of this project." },
    ],
    practiceQuestions: [
      "What was the situation?",
      "What did you do?",
      "What was the result?",
    ],
    roleplayPrompt:
      "Act as a colleague asking about a project. Ask for the situation, action, and result.",
  }),
  createWorkplaceMission({
    id: "workplace-day-23-present-a-recommendation",
    dayNumber: 23,
    weekNumber: 4,
    level: "B1",
    title: "Present a recommendation",
    goal: "Present a recommendation with reason, risk, and next step.",
    scenario: "You recommend a direction in a planning discussion.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "My recommendation is...",
        meaningVi: "de xuat cua toi la...",
        example: "My recommendation is to launch a smaller version first.",
      },
      {
        text: "The main risk is...",
        meaningVi: "rui ro chinh la...",
        example: "The main risk is that we do not have enough test data.",
      },
      {
        text: "To reduce that risk...",
        meaningVi: "de giam rui ro do...",
        example: "To reduce that risk, we can run a small test.",
      },
    ],
    targetVocabulary: [
      { word: "direction", meaningVi: "huong di", example: "This direction is safer." },
      { word: "launch", meaningVi: "ra mat", example: "We can launch next week." },
      { word: "reduce", meaningVi: "giam", example: "This can reduce risk." },
    ],
    practiceQuestions: [
      "What is your recommendation?",
      "What is the main risk?",
      "How can the team reduce that risk?",
    ],
    roleplayPrompt:
      "Act as a product manager. Ask the learner to present a recommendation with reason, risk, and next step.",
  }),
  createWorkplaceMission({
    id: "workplace-day-24-handle-questions",
    dayNumber: 24,
    weekNumber: 4,
    level: "B1",
    title: "Handle questions",
    goal: "Answer challenging questions without freezing or over-explaining.",
    scenario: "A teammate challenges your recommendation.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "That's a fair question.",
        meaningVi: "do la cau hoi hop ly",
        example: "That's a fair question.",
      },
      {
        text: "The short answer is...",
        meaningVi: "cau tra loi ngan gon la...",
        example: "The short answer is that it saves time.",
      },
      {
        text: "I can follow up with...",
        meaningVi: "toi co the bo sung sau ve...",
        example: "I can follow up with more data after the meeting.",
      },
    ],
    targetVocabulary: [
      { word: "challenge", meaningVi: "thach thuc, dat cau hoi kho", example: "He challenged the proposal." },
      { word: "short answer", meaningVi: "cau tra loi ngan gon", example: "The short answer is yes." },
      { word: "follow up", meaningVi: "bo sung sau", example: "I will follow up with details." },
    ],
    practiceQuestions: [
      "How do you respond to a fair question?",
      "What is the short answer?",
      "What can you follow up with later?",
    ],
    roleplayPrompt:
      "Act as a teammate challenging the learner's idea. Ask two difficult but fair questions.",
  }),
  createWorkplaceMission({
    id: "workplace-day-25-lead-a-short-sync",
    dayNumber: 25,
    weekNumber: 4,
    level: "B1",
    title: "Lead a short sync",
    goal: "Lead a short meeting with agenda, check-in, and next steps.",
    scenario: "You lead a 10-minute team sync.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "Let's start with...",
        meaningVi: "hay bat dau voi...",
        example: "Let's start with the release status.",
      },
      {
        text: "Can you give a quick update on...?",
        meaningVi: "ban co the cap nhat nhanh ve... khong",
        example: "Can you give a quick update on testing?",
      },
      {
        text: "To wrap up...",
        meaningVi: "de ket lai...",
        example: "To wrap up, we have two action items.",
      },
    ],
    targetVocabulary: [
      { word: "agenda", meaningVi: "chuong trinh hop", example: "The agenda has three items." },
      { word: "sync", meaningVi: "cuoc hop dong bo ngan", example: "We have a sync at 10." },
      { word: "wrap up", meaningVi: "ket lai", example: "Let's wrap up the meeting." },
    ],
    practiceQuestions: [
      "How do you start the sync?",
      "How do you ask for a quick update?",
      "How do you close the meeting?",
    ],
    roleplayPrompt:
      "Act as a teammate in a short sync. Let the learner lead the meeting, ask for updates, and close with next steps.",
  }),
  createWorkplaceMission({
    id: "workplace-day-26-give-feedback",
    dayNumber: 26,
    weekNumber: 4,
    level: "B1",
    title: "Give feedback",
    goal: "Give balanced feedback with one positive point and one improvement.",
    scenario: "A teammate asks for feedback on their work.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "What worked well was...",
        meaningVi: "dieu da lam tot la...",
        example: "What worked well was the clear layout.",
      },
      {
        text: "One thing to improve is...",
        meaningVi: "mot diem can cai thien la...",
        example: "One thing to improve is the error message.",
      },
      {
        text: "A suggestion would be...",
        meaningVi: "mot goi y la...",
        example: "A suggestion would be to add an empty state.",
      },
    ],
    targetVocabulary: [
      { word: "balanced", meaningVi: "can bang", example: "Balanced feedback is more helpful." },
      { word: "improve", meaningVi: "cai thien", example: "This section can improve." },
      { word: "suggestion", meaningVi: "goi y", example: "I have one suggestion." },
    ],
    practiceQuestions: [
      "What worked well?",
      "What can be improved?",
      "What suggestion can you give?",
    ],
    roleplayPrompt:
      "Act as a teammate asking for feedback. Let the learner give one positive point and one improvement suggestion.",
  }),
  createWorkplaceMission({
    id: "workplace-day-27-recap-action-items",
    dayNumber: 27,
    weekNumber: 4,
    level: "B1",
    title: "Recap action items",
    goal: "Recap who will do what, by when, and what depends on what.",
    scenario: "At the end of a meeting, you summarize the action items.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "I'll take care of...",
        meaningVi: "toi se phu trach...",
        example: "I'll take care of the API test.",
      },
      {
        text: "You will handle...",
        meaningVi: "ban se xu ly...",
        example: "You will handle the design update.",
      },
      {
        text: "This depends on...",
        meaningVi: "viec nay phu thuoc vao...",
        example: "This depends on getting test data today.",
      },
    ],
    targetVocabulary: [
      { word: "action item", meaningVi: "viec can lam", example: "We have three action items." },
      { word: "owner", meaningVi: "nguoi phu trach", example: "Each task needs an owner." },
      { word: "dependency", meaningVi: "phu thuoc", example: "This dependency may block us." },
    ],
    practiceQuestions: [
      "What will you take care of?",
      "What will the teammate handle?",
      "What does the task depend on?",
    ],
    roleplayPrompt:
      "Act as a teammate at the end of a meeting. Ask the learner to recap action items, owners, and dependencies.",
  }),
  createWorkplaceMission({
    id: "workplace-day-28-week-4-review",
    dayNumber: 28,
    weekNumber: 4,
    level: "B1",
    title: "Week 4 confident speaking review",
    goal: "Review confident speaking skills and choose one area to polish.",
    scenario: "Your speaking coach reviews your confident speaking week.",
    estimatedMinutes: 25,
    targetChunks: [
      {
        text: "I can now...",
        meaningVi: "bay gio toi co the...",
        example: "I can now give a recommendation more clearly.",
      },
      {
        text: "I sound more confident when...",
        meaningVi: "toi nghe tu tin hon khi...",
        example: "I sound more confident when I use clear structure.",
      },
      {
        text: "I want to polish...",
        meaningVi: "toi muon trau chuot...",
        example: "I want to polish my Q&A answers.",
      },
    ],
    targetVocabulary: [
      { word: "polish", meaningVi: "trau chuot", example: "I want to polish my opening line." },
      { word: "structure", meaningVi: "cau truc", example: "A clear structure helps fluency." },
      { word: "confident", meaningVi: "tu tin", example: "I sound more confident now." },
    ],
    practiceQuestions: [
      "What can you do now?",
      "When do you sound more confident?",
      "What do you want to polish?",
    ],
    roleplayPrompt:
      "Act as a speaking coach. Ask the learner to review confident speaking skills and choose one area to polish.",
  }),
  createWorkplaceMission({
    id: "workplace-day-29-mock-workplace-conversation",
    dayNumber: 29,
    weekNumber: 5,
    level: "B1",
    title: "Mock workplace conversation",
    goal: "Handle a mixed workplace conversation using update, clarification, opinion, and next steps.",
    scenario: "A manager asks about a project, a blocker, your opinion, and next steps.",
    estimatedMinutes: 30,
    targetChunks: [
      {
        text: "To give you the full picture...",
        meaningVi: "de cho ban buc tranh day du...",
        example: "To give you the full picture, the feature works but tests are not done.",
      },
      {
        text: "The key point is...",
        meaningVi: "diem chinh la...",
        example: "The key point is that we need one more review.",
      },
      {
        text: "My next step is...",
        meaningVi: "buoc tiep theo cua toi la...",
        example: "My next step is to fix the last bug.",
      },
    ],
    targetVocabulary: [
      { word: "full picture", meaningVi: "buc tranh day du", example: "Let me give the full picture." },
      { word: "key point", meaningVi: "diem chinh", example: "The key point is the timeline." },
      { word: "mixed", meaningVi: "ket hop", example: "This is a mixed conversation." },
    ],
    practiceQuestions: [
      "What is the full picture?",
      "What is the key point?",
      "What is your next step?",
    ],
    roleplayPrompt:
      "Act as a manager in a mixed workplace conversation. Ask about status, blocker, opinion, and next step.",
  }),
  createWorkplaceMission({
    id: "workplace-day-30-final-mini-assessment",
    dayNumber: 30,
    weekNumber: 5,
    level: "B1",
    title: "Final mini assessment",
    goal: "Give a longer workplace answer that combines introduction, progress, problem, opinion, and plan.",
    scenario: "Your coach runs a final 30-day workplace speaking assessment.",
    estimatedMinutes: 30,
    targetChunks: [
      {
        text: "Over the last month, I have improved...",
        meaningVi: "trong thang qua toi da cai thien...",
        example: "Over the last month, I have improved my meeting answers.",
      },
      {
        text: "I can handle...",
        meaningVi: "toi co the xu ly...",
        example: "I can handle status updates and clarification questions.",
      },
      {
        text: "My next goal is...",
        meaningVi: "muc tieu tiep theo cua toi la...",
        example: "My next goal is to speak more naturally in real meetings.",
      },
    ],
    targetVocabulary: [
      { word: "assessment", meaningVi: "danh gia", example: "This is my final assessment." },
      { word: "handle", meaningVi: "xu ly", example: "I can handle follow-up questions." },
      { word: "next goal", meaningVi: "muc tieu tiep theo", example: "My next goal is fluency." },
    ],
    practiceQuestions: [
      "What have you improved over the last month?",
      "What workplace conversations can you handle now?",
      "What is your next speaking goal?",
    ],
    roleplayPrompt:
      "Act as a speaking coach running a final assessment. Ask the learner to give a longer answer about progress, confidence, and next goal.",
  }),
];

export const thirtyDayMissionPath: SpeakingMission[] = [
  ...sevenDayMissionPath,
  ...expandedWorkplaceMissionPath,
];

export function getMissionPath({
  track = "workplace",
}: MissionLookupOptions = {}) {
  return thirtyDayMissionPath
    .filter((mission) => mission.track === track)
    .toSorted((first, second) => first.dayNumber - second.dayNumber);
}

export function getMissionById(missionId: string) {
  return thirtyDayMissionPath.find((mission) => mission.id === missionId) ?? null;
}

export function getMissionByDayNumber(
  dayNumber: number,
  { track = "workplace" }: MissionLookupOptions = {},
) {
  return getMissionPath({ track }).find((mission) => mission.dayNumber === dayNumber) ?? null;
}

export function getFirstMission(options: MissionLookupOptions = {}) {
  return getMissionPath(options)[0] ?? null;
}

export function getPreviousMission(
  mission: SpeakingMission,
  options: MissionLookupOptions = {},
) {
  return getMissionByDayNumber(mission.dayNumber - 1, {
    track: options.track ?? mission.track,
  });
}

export function getNextMission(
  mission: SpeakingMission,
  options: MissionLookupOptions = {},
) {
  return getMissionByDayNumber(mission.dayNumber + 1, {
    track: options.track ?? mission.track,
  });
}

export function resolveMissionDayNumber({
  completedMissions,
  track = "workplace",
}: {
  completedMissions: number;
  track?: MissionTrack;
}) {
  const missionPath = getMissionPath({ track });
  const maxDayNumber = missionPath.at(-1)?.dayNumber ?? 1;
  const nextDayNumber = completedMissions + 1;

  return Math.min(Math.max(nextDayNumber, 1), maxDayNumber);
}

export function resolveMissionByCompletedCount({
  completedMissions,
  track = "workplace",
}: {
  completedMissions: number;
  track?: MissionTrack;
}) {
  const dayNumber = resolveMissionDayNumber({ completedMissions, track });
  return getMissionByDayNumber(dayNumber, { track }) ?? getFirstMission({ track });
}
