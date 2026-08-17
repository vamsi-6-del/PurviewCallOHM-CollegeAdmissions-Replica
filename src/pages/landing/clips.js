import { MessagesSquare, GraduationCap, Wallet, Megaphone, BellRing } from 'lucide-react'

import vidEnquiries from '../../assets/Student_enquiries_answered_24_7_1080p_202608051543.mp4'
import vidCourses from '../../assets/Personalised_course_recommendations_1080p_202608051542.mp4'
import vidFees from '../../assets/Fees_and_scholarships_explained_1080p_202608051543.mp4'
import vidExams from '../../assets/Entrance_Exam_Campaigns_Connect_1080p_202608051543.mp4'
import vidReminders from '../../assets/Automated_admission_reminders_1080p_202608051543.mp4'

/* The season told in five clips. The first one plays in the hero; the rest
   are the rows of VideoStorySection. Shared from here so both read the same
   list and neither file has to export a non-component. */
export const CLIPS = [
  {
    icon: MessagesSquare,
    tag: 'Always on',
    title: 'Student enquiries answered 24/7',
    body: 'A candidate calling at 11 PM gets the same answer your best counsellor would give at 11 AM. No queue, no voicemail, no missed window.',
    points: [
      'Picks up at 11 PM as readily as 11 AM',
      'Fees, cutoffs and placements answered on the spot',
    ],
    src: vidEnquiries,
  },
  {
    icon: GraduationCap,
    tag: 'Guidance',
    title: 'Personalised course recommendations',
    body: 'The agent reads their rank, stream and interest, then pitches the branches they actually qualify for.',
    points: [
      'Matched to the score bands you actually admit',
      'Steers undecided candidates to a live branch',
    ],
    src: vidCourses,
  },
  {
    icon: Wallet,
    tag: 'Objections',
    title: 'Fees and scholarships explained',
    body: 'Fee structure, instalments and scholarship eligibility handled on the call, the question that stalls most admissions.',
    points: [
      'Instalment and loan options explained plainly',
      'Scholarship eligibility checked on the spot',
    ],
    src: vidFees,
  },
  {
    icon: Megaphone,
    tag: 'Campaigns',
    title: 'Entrance exam campaigns that connect',
    body: 'Reach whole score bands the day results drop, in the language each candidate prefers.',
    points: [
      'Thousands of calls launched the day results land',
      '30+ Indian languages on the same agent',
    ],
    src: vidExams,
  },
  {
    icon: BellRing,
    tag: 'Follow-up',
    title: 'Automated admission reminders',
    body: 'Counselling dates, document deadlines and fee cut-offs chased automatically, so no seat is lost to silence.',
    points: [
      'Counselling and document deadlines chased',
      'Escalated to a counsellor when it stalls',
    ],
    src: vidReminders,
  },
]
