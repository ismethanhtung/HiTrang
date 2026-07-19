import { Quiz, Submission } from './types';

export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: 'q1',
    title: 'Kiểm tra Đại số Lớp 10 - Chương 1: Mệnh đề & Tập hợp',
    description: 'Bài kiểm tra đánh giá kiến thức cơ bản về mệnh đề toán học, các phép toán tập hợp và các khoảng đoạn số.',
    subject: 'Toán học',
    duration: 15,
    createdAt: '2026-07-10',
    questions: [
      {
        id: 'q1_1',
        text: 'Trong các phát biểu sau, phát biểu nào là một mệnh đề toán học?',
        options: [
          'Hôm nay trời đẹp quá!',
          'Học sinh lớp 10 thật là chăm chỉ.',
          'Số 15 là số nguyên tố.',
          'Bạn có thích môn Toán không?'
        ],
        correctAnswerIndex: 2,
        points: 2.5
      },
      {
        id: 'q1_2',
        text: 'Cho tập hợp A = {1; 2; 3} và B = {2; 3; 4; 5}. Giao của hai tập hợp A và B là:',
        options: [
          '{2; 3}',
          '{1; 2; 3; 4; 5}',
          '{1; 4; 5}',
          'Tập hợp rỗng'
        ],
        correctAnswerIndex: 0,
        points: 2.5
      },
      {
        id: 'q1_3',
        text: 'Ký hiệu nào sau đây biểu diễn cho tập hợp số tự nhiên?',
        options: [
          'R',
          'Z',
          'Q',
          'N'
        ],
        correctAnswerIndex: 3,
        points: 2.5
      },
      {
        id: 'q1_4',
        text: 'Mệnh đề phủ định của mệnh đề "Mọi học sinh trong lớp đều thích học môn Toán" là gì?',
        options: [
          'Mọi học sinh trong lớp đều không thích học môn Toán.',
          'Có ít nhất một học sinh trong lớp thích học môn Toán.',
          'Có ít nhất một học sinh trong lớp không thích học môn Toán.',
          'Không có học sinh nào không thích học môn Toán.'
        ],
        correctAnswerIndex: 2,
        points: 2.5
      }
    ]
  },
  {
    id: 'q2',
    title: 'Trắc nghiệm Vật lý Lớp 11 - Dòng điện không đổi',
    description: 'Đánh giá hiểu biết về định luật Ohm cho toàn mạch, nguồn điện và các cách ghép nguồn.',
    subject: 'Vật lý',
    duration: 20,
    createdAt: '2026-07-12',
    questions: [
      {
        id: 'q2_1',
        text: 'Đơn vị đo cường độ dòng điện trong hệ SI là:',
        options: [
          'Volt (V)',
          'Ampere (A)',
          'Ohm (Ω)',
          'Watt (W)'
        ],
        correctAnswerIndex: 1,
        points: 3.3
      },
      {
        id: 'q2_2',
        text: 'Công thức của định luật Ohm cho toàn mạch là:',
        options: [
          'I = U / R',
          'I = E / (R + r)',
          'I = q / t',
          'P = U * I'
        ],
        correctAnswerIndex: 1,
        points: 3.3
      },
      {
        id: 'q2_3',
        text: 'Một nguồn điện có suất điện động 6V, điện trở trong r = 1Ω mắc với điện trở ngoài R = 5Ω. Cường độ dòng điện trong mạch là:',
        options: [
          '1.2 A',
          '6 A',
          '1.0 A',
          '0.5 A'
        ],
        correctAnswerIndex: 2,
        points: 3.4
      }
    ]
  },
  {
    id: 'q3',
    title: 'Kiểm tra Đọc hiểu Ngữ văn 12 - Thơ ca Kháng chiến',
    description: 'Đọc hiểu và phân tích các biện pháp nghệ thuật, nội dung tư tưởng trong tác phẩm "Tây Tiến" của Quang Dũng.',
    subject: 'Ngữ văn',
    duration: 10,
    createdAt: '2026-07-15',
    questions: [
      {
        id: 'q3_1',
        text: 'Bút pháp nghệ thuật nổi bật nhất của bài thơ "Tây Tiến" là gì?',
        options: [
          'Bút pháp hiện thực nghiêm ngặt',
          'Bút pháp lãng mạn kết hợp bi tráng',
          'Bút pháp cổ điển, ước lệ tượng trưng',
          'Bút pháp trào phúng, châm biếm'
        ],
        correctAnswerIndex: 1,
        points: 5.0
      },
      {
        id: 'q3_2',
        text: 'Hình ảnh đoàn binh Tây Tiến "không mọc tóc" phản ánh thực tế khốc liệt nào của chiến trường lúc bấy giờ?',
        options: [
          'Học sinh tự cạo trọc đầu để thể hiện quyết tâm chiến đấu',
          'Căn bệnh sốt rét rừng hiểm ác hoành hành',
          'Kiểu tóc quy chuẩn của quân đội',
          'Ảnh hưởng của hóa chất chiến tranh'
        ],
        correctAnswerIndex: 1,
        points: 5.0
      }
    ]
  }
];

export const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: 's1',
    quizId: 'q1',
    quizTitle: 'Kiểm tra Đại số Lớp 10 - Chương 1: Mệnh đề & Tập hợp',
    studentId: 'std1',
    studentName: 'Nguyễn Văn An',
    score: 10.0,
    totalQuestions: 4,
    submittedAt: '2026-07-16 08:32',
    answers: { 'q1_1': 2, 'q1_2': 0, 'q1_3': 3, 'q1_4': 2 }
  },
  {
    id: 's2',
    quizId: 'q1',
    quizTitle: 'Kiểm tra Đại số Lớp 10 - Chương 1: Mệnh đề & Tập hợp',
    studentId: 'std2',
    studentName: 'Trần Thị Bình',
    score: 7.5,
    totalQuestions: 4,
    submittedAt: '2026-07-16 09:15',
    answers: { 'q1_1': 2, 'q1_2': 1, 'q1_3': 3, 'q1_4': 2 }
  },
  {
    id: 's3',
    quizId: 'q2',
    quizTitle: 'Trắc nghiệm Vật lý Lớp 11 - Dòng điện không đổi',
    studentId: 'std3',
    studentName: 'Phạm Minh Cường',
    score: 6.6,
    totalQuestions: 3,
    submittedAt: '2026-07-17 14:05',
    answers: { 'q2_1': 1, 'q2_2': 0, 'q2_3': 2 }
  },
  {
    id: 's4',
    quizId: 'q1',
    quizTitle: 'Kiểm tra Đại số Lớp 10 - Chương 1: Mệnh đề & Tập hợp',
    studentId: 'std4',
    studentName: 'Lê Hoàng Dương',
    score: 5.0,
    totalQuestions: 4,
    submittedAt: '2026-07-17 15:30',
    answers: { 'q1_1': 2, 'q1_2': 1, 'q1_3': 2, 'q1_4': 2 }
  },
  {
    id: 's5',
    quizId: 'q3',
    quizTitle: 'Kiểm tra Đọc hiểu Ngữ văn 12 - Thơ ca Kháng chiến',
    studentId: 'std2',
    studentName: 'Trần Thị Bình',
    score: 10.0,
    totalQuestions: 2,
    submittedAt: '2026-07-18 10:22',
    answers: { 'q3_1': 1, 'q3_2': 1 }
  },
  {
    id: 's6',
    quizId: 'q2',
    quizTitle: 'Trắc nghiệm Vật lý Lớp 11 - Dòng điện không đổi',
    studentId: 'std1',
    studentName: 'Nguyễn Văn An',
    score: 10.0,
    totalQuestions: 3,
    submittedAt: '2026-07-18 11:45',
    answers: { 'q2_1': 1, 'q2_2': 1, 'q2_3': 2 }
  },
  {
    id: 's7',
    quizId: 'q3',
    quizTitle: 'Kiểm tra Đọc hiểu Ngữ văn 12 - Thơ ca Kháng chiến',
    studentId: 'std5',
    studentName: 'Vũ Quốc Khánh',
    score: 5.0,
    totalQuestions: 2,
    submittedAt: '2026-07-18 16:50',
    answers: { 'q3_1': 0, 'q3_2': 1 }
  }
];

export const STUDENT_LIST = [
  { id: 'std1', name: 'Nguyễn Văn An', username: 'vanan', email: 'an.nv@school.edu.vn', group: '10A1', quizzesCount: 2, avgScore: 10.0 },
  { id: 'std2', name: 'Trần Thị Bình', username: 'thibinh', email: 'binh.tt@school.edu.vn', group: '10A1', quizzesCount: 2, avgScore: 8.75 },
  { id: 'std3', name: 'Phạm Minh Cường', username: 'minhcuong', email: 'cuong.pm@school.edu.vn', group: '11B3', quizzesCount: 1, avgScore: 6.6 },
  { id: 'std4', name: 'Lê Hoàng Dương', username: 'hoangduong', email: 'duong.lh@school.edu.vn', group: '10A1', quizzesCount: 1, avgScore: 5.0 },
  { id: 'std5', name: 'Vũ Quốc Khánh', username: 'quockhanh', email: 'khanh.vq@school.edu.vn', group: '12C1', quizzesCount: 1, avgScore: 5.0 }
];

export const SYSTEM_CHART_DATA = [
  { month: 'Tháng 1', submissions: 12, avgScore: 7.2 },
  { month: 'Tháng 2', submissions: 19, avgScore: 7.5 },
  { month: 'Tháng 3', submissions: 25, avgScore: 7.8 },
  { month: 'Tháng 4', submissions: 32, avgScore: 8.1 },
  { month: 'Tháng 5', submissions: 48, avgScore: 8.0 },
  { month: 'Tháng 6', submissions: 56, avgScore: 8.4 },
  { month: 'Tháng 7', submissions: 68, avgScore: 8.6 },
];
