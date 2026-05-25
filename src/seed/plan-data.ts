export const PLAN_TITLE = "Hybrid Cloud Engineer Blueprint - 16 Week Transition";
export const PLAN_DESCRIPTION =
  "CCNP ENCOR certification + Cloud Portfolio build. Weekends for class theory, weekdays for 1-hour project portfolio.";

export interface PhaseData {
  phase_number: number;
  title: string;
  description: string;
  strategic_focus: string;
  tasks: {
    week_number: number;
    title: string;
    task_type: "weekend" | "weekday" | "milestone" | "full_focus";
    sort_order: number;
  }[];
}

export const phases: PhaseData[] = [
  {
    phase_number: 1,
    title: "Cloud Foundations",
    description: "Establish the routine and build first cloud architecture",
    strategic_focus:
      "Establish the Routine. Treat weekends as sacred study time. Don't overthink AWS - just click through the console. Push first project to GitHub for visible wins.",
    tasks: [
      {
        week_number: 1,
        title: "Attend CCNP Class - Architecture & Virtualization notes",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 1,
        title: "Set up AWS Free Tier account. Create first VPC and configure 3 Subnets",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 2,
        title: "Attend Class - Review homework and assigned reading",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 2,
        title: "Launch EC2 instances within AWS subnets. Take screenshots",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 2,
        title: 'Publish "Project 1" on GitHub with clear README',
        task_type: "milestone",
        sort_order: 3,
      },
      {
        week_number: 3,
        title: "Maintain perfect class attendance - consistency beats intensity",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 3,
        title: "Update CV and LinkedIn headline. Pin Project 1 to featured",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 4,
        title: "Attend CCNP Class - continue attendance streak",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 4,
        title: "Finalize Project 1 documentation and portfolio entry",
        task_type: "weekday",
        sort_order: 2,
      },
    ],
  },
  {
    phase_number: 2,
    title: "Infrastructure as Code",
    description: "Translate cloud architecture into Terraform code using AI assistance",
    strategic_focus:
      "Month 2 covers OSPF, BGP, complex routing. Requires extra focus. Use AI (Claude/ChatGPT) to generate Terraform code. Understanding text-file-to-network is the key 2026 skill.",
    tasks: [
      {
        week_number: 5,
        title: "Attend Class - Pay extreme attention to Layer 2/3 protocols",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 5,
        title: "Install Terraform. Prompt AI to translate Project 1 into .tf files",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 6,
        title: "Attend Class - Continue L2/L3 protocol study",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 6,
        title: "Continue building Terraform configuration with AI assistance",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 7,
        title: "Attend Class - Review all routing labs",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 7,
        title: "Run terraform apply. Troubleshoot errors with AI until network deploys",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 8,
        title: "Attend Class - Complete routing module review",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 8,
        title: "Final terraform apply verification and cleanup",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 8,
        title: 'Publish "Project 2: VPC as Code" to GitHub. Post LinkedIn update',
        task_type: "milestone",
        sort_order: 3,
      },
    ],
  },
  {
    phase_number: 3,
    title: "The Automation Bridge",
    description: "Build CI/CD pipeline with GitHub Actions to automate infrastructure",
    strategic_focus:
      "Closing the Loop: final syllabus modules (Wireless, Security, Automation). Patience with YAML - pipelines will fail. Read error logs, fix spacing, try again. Portfolio completion month.",
    tasks: [
      {
        week_number: 9,
        title: "Attend final modules of CCNP Class - don't skip these",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 9,
        title: "Create .github/workflows/main.yml in Terraform repository",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 10,
        title: "Attend Class - Security and Automation modules",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 10,
        title: "Configure basic workflow triggers and steps",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 11,
        title: "Complete class syllabus. Ask instructor for mock exam strategy",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 11,
        title: "Configure workflow: every push triggers terraform plan",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 12,
        title: "Review all class material and prepare for exam phase",
        task_type: "weekend",
        sort_order: 1,
      },
      {
        week_number: 12,
        title: "Debug and finalize pipeline until green checkmark appears",
        task_type: "weekday",
        sort_order: 2,
      },
      {
        week_number: 12,
        title: "GitHub Actions green checkmark verified - CI/CD portfolio COMPLETE",
        task_type: "milestone",
        sort_order: 3,
      },
    ],
  },
  {
    phase_number: 4,
    title: "Execute & Certify",
    description: "100% exam focus - halt all projects and pass CCNP ENCOR",
    strategic_focus:
      "HALT ALL PROJECTS. Single goal: pass the exam. Target: consistently score 850+ on practice exams. Review over Volume - spend double time reviewing WHY you got questions wrong.",
    tasks: [
      {
        week_number: 13,
        title: "Take Practice Exam 1. Review ALL wrong answers",
        task_type: "full_focus",
        sort_order: 1,
      },
      {
        week_number: 13,
        title: "Re-read chapters corresponding to weakest scores",
        task_type: "full_focus",
        sort_order: 2,
      },
      {
        week_number: 14,
        title: "Take Practice Exam 2. Identify remaining knowledge gaps",
        task_type: "full_focus",
        sort_order: 1,
      },
      {
        week_number: 14,
        title: "Targeted revision on identified weak areas",
        task_type: "full_focus",
        sort_order: 2,
      },
      {
        week_number: 15,
        title: "Light revision only. Do NOT cram",
        task_type: "full_focus",
        sort_order: 1,
      },
      {
        week_number: 16,
        title: "Final light review and exam preparation",
        task_type: "full_focus",
        sort_order: 1,
      },
      {
        week_number: 16,
        title: "PASS the CCNP ENCOR 350-401 Exam",
        task_type: "milestone",
        sort_order: 2,
      },
    ],
  },
];
