
// Type guards para validação de runtime
export const isValidUserPlan = (plan: string): plan is 'free' | 'vip' | 'pro' => {
  return ['free', 'vip', 'pro'].includes(plan);
};

export const isValidUserRole = (role: string): role is 'user' | 'admin' | 'moderator' => {
  return ['user', 'admin', 'moderator'].includes(role);
};

export const isValidContentType = (type: string): type is 'course' | 'tutorial' | 'webinar' | 'article' => {
  return ['course', 'tutorial', 'webinar', 'article'].includes(type);
};

export const isValidNotificationType = (type: string): type is 'info' | 'warning' | 'error' | 'success' => {
  return ['info', 'warning', 'error', 'success'].includes(type);
};

export const isValidToolStatus = (status: string): status is 'active' | 'maintenance' | 'blocked' => {
  return ['active', 'maintenance', 'blocked'].includes(status);
};

// Validação de dados críticos
export const validateProfileData = (data: any): data is {
  user_id: string;
  full_name: string | null;
  plan: 'free' | 'vip' | 'pro';
  role: 'user' | 'admin' | 'moderator';
} => {
  return (
    data &&
    typeof data.user_id === 'string' &&
    (data.full_name === null || typeof data.full_name === 'string') &&
    isValidUserPlan(data.plan) &&
    isValidUserRole(data.role)
  );
};

export const validateContentData = (data: any): data is {
  id: string;
  title: string;
  content_type: 'course' | 'tutorial' | 'webinar' | 'article';
  required_plan: 'free' | 'vip' | 'pro';
} => {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    isValidContentType(data.content_type) &&
    isValidUserPlan(data.required_plan)
  );
};
