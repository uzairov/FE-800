// Single source of truth for competency labels.
// Used by /dashboard/assessments/new (selection list) and /report (radar + cards).

export const COMPETENCY_LABELS: Record<string, string> = {
  // Sales / negotiation
  sales_skills:               'Навыки продаж',
  negotiation:                'Переговоры',
  result_orientation:         'Ориентация на результат',
  service_orientation:        'Клиентоориентированность',

  // Communication / EQ
  communication_flexibility:  'Гибкость общения',
  emotional_intelligence:     'Эмоциональный интеллект',
  empathy:                    'Эмпатия',
  conflict_management:        'Управление конфликтами',

  // Stress / personality
  stress_resistance:          'Стрессоустойчивость',
  monotolerance:              'Моноустойчивость',
  self_motivation:            'Самомотивация',
  motivation:                 'Мотивация',
  locus_of_control:           'Локус контроля',
  honesty:                    'Честность',
  ethical_judgment:           'Этическое суждение',
  responsibility:             'Ответственность',

  // Attention
  attention:                  'Внимательность',
  attention_to_detail:        'Внимательность к деталям',

  // Thinking
  systems_thinking:           'Системное мышление',
  strategic_thinking:         'Стратегическое мышление',
  analytical_thinking:        'Аналитическое мышление',
  problem_solving:            'Решение проблем',
  decision_making:            'Принятие решений',
  risk_assessment:            'Оценка рисков',
  process_orientation:        'Процессное мышление',
  innovation:                 'Инновационность',

  // Leadership / management
  leadership:                 'Лидерство',
  coaching:                   'Коучинг',
  delegation:                 'Делегирование',
  stakeholder_management:     'Работа со стейкхолдерами',

  // Work style
  teamwork:                   'Командная работа',
  learning_agility:           'Обучаемость',
  time_management:            'Тайм-менеджмент',
  adaptability:               'Адаптивность',
  proactivity:                'Проактивность',
};

export function competencyLabel(key: string): string {
  return COMPETENCY_LABELS[key] ?? key;
}
