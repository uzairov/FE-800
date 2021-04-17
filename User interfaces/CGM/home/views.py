from django.shortcuts import render
from django.utils.safestring import mark_safe


def home(request):
    key_features_1 = "Cнижает налогоблажение на инвестиции и увеличивает" \
                     " доходы после уплаты налогов."
    key_features_2 = "Robo-Advisor v1.0 не имеет скрытых комиссий. Для получения услуг требуется " \
                     "небольшой начальный депозит. "
    key_features_3 = "С Robo-Advisor v 1.0 выбрать подходящее портфель легко, независимо от вашего уровня опыта " \
                     "Мы порекомендуем вам индивидуальное распределение на основе вашего профиля риска."
    key_features_4 = "Robo-Advisor v1.0 поддерживает оптимальное соотношение активов в портфеле " \
                     "для получения оптимальнй доходности."



    context = {
        "key_features_1": mark_safe(key_features_1),
        "key_features_2": mark_safe(key_features_2),
        "key_features_3": mark_safe(key_features_3),
        "key_features_4": mark_safe(key_features_4),



    }

    return render(request, 'home/home.html', context)
