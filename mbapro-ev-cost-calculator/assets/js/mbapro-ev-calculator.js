(function () {
  'use strict';

  /**
   * Format a number as currency with two decimals.
   *
   * @param {number} value Number to format.
   * @returns {string}
   */
  function formatCurrency(value) {
    if (isNaN(value)) {
      return '—';
    }

    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' ' + (window.MBAPROEvCalculatorConfig ? window.MBAPROEvCalculatorConfig.currency : '€');
  }

  /**
   * Normalise an input value into a float, managing comma separators.
   *
   * @param {HTMLInputElement|null} input Input element.
   * @returns {number}
   */
  function parseInputValue(input) {
    if (!input) {
      return NaN;
    }

    var rawValue = typeof input.value === 'string' ? input.value.trim() : '';
    if (rawValue === '') {
      return NaN;
    }

    return parseFloat(rawValue.replace(',', '.'));
  }

  /**
   * Toggle helper for advanced fields container.
   *
   * @param {HTMLElement} toggle
   * @param {HTMLElement} container
   */
  function bindAdvancedToggle(toggle, container) {
    if (!toggle || !container) {
      return;
    }

    toggle.setAttribute('aria-expanded', 'false');
    container.setAttribute('aria-hidden', 'true');
    container.hidden = true;

    toggle.addEventListener('click', function () {
      container.classList.toggle('is-visible');

      var isVisible = container.classList.contains('is-visible');
      toggle.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
      container.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
      container.hidden = !isVisible;
    });
  }

  /**
   * Bind interactions for individual advanced groups toggled by checkboxes.
   *
   * @param {Object} advancedGroups Map of advanced groups.
   * @param {HTMLElement|null} tipElement Element that displays repartition tips.
   */
  function bindAdvancedGroups(advancedGroups, tipElement) {
    if (!advancedGroups) {
      return;
    }

    Object.keys(advancedGroups).forEach(function (key) {
      var config = advancedGroups[key];

      if (!config || !config.checkbox || !config.group) {
        return;
      }

      toggleAdvancedGroup(config, config.checkbox.checked);

      config.checkbox.addEventListener('change', function () {
        toggleAdvancedGroup(config, config.checkbox.checked);

        if (!config.checkbox.checked) {
          if (config.percentage) {
            clearError(config.percentage);
            if (config.percentage.input) {
              config.percentage.input.value = '';
            }
          }
          if (config.price) {
            clearError(config.price);
            if (config.price.input) {
              config.price.input.value = '';
            }
          }
        }

        updateAdvancedTip(tipElement, '');
      });
    });
  }

  /**
   * Toggle visibility of a single advanced group block.
   *
   * @param {Object} config Group configuration.
   * @param {boolean} active Whether group should be visible.
   */
  function toggleAdvancedGroup(config, active) {
    if (!config || !config.group) {
      return;
    }

    config.group.classList.toggle('is-visible', !!active);
    config.group.hidden = !active;
    config.group.setAttribute('aria-hidden', active ? 'false' : 'true');

    if (config.label) {
      config.label.classList.toggle('is-active', !!active);
    }
  }

  /**
   * Perform the EV cost calculation.
   *
   * @param {Object} inputs Input nodes keyed by identifier.
   * @param {Object} outputs Output nodes keyed by identifier.
   * @param {Object} subs Subtitle nodes keyed by identifier.
   * @param {Object} charts Chart nodes keyed by period.
   */
  function bindCalculator(inputs, outputs, subs, charts) {
    var calculateButton = inputs.calculateButton;
    if (!calculateButton) {
      return;
    }

    calculateButton.addEventListener('click', function () {
      var values = getInputValues(inputs);

      if (!values.isValid) {
        return;
      }

      var kWhPerDay = (values.dailyKm * values.consumption) / 100;
      var pricePerKWh = values.price;

      var costPerDay = kWhPerDay * pricePerKWh;
      var costPerWeek = costPerDay * 7;
      var costPerMonth = costPerDay * 30;
      var costPerYear = costPerDay * 365;
      var costPer100km = values.consumption * pricePerKWh;

      outputs.per_100km.textContent = formatCurrency(costPer100km);
      outputs.per_day.textContent = formatCurrency(costPerDay);
      outputs.per_week.textContent = formatCurrency(costPerWeek);
      outputs.per_month.textContent = formatCurrency(costPerMonth);
      outputs.per_year.textContent = formatCurrency(costPerYear);

      subs.per_day.textContent = 'Basé sur ' + formatCurrency(costPerDay) + ' par jour.';
      subs.per_week.textContent = 'Projection de ' + formatCurrency(costPerWeek) + ' chaque semaine.';
      subs.per_month.textContent = 'Environ ' + formatCurrency(costPerMonth) + ' par mois.';
      subs.per_year.textContent = 'Soit ' + formatCurrency(costPerYear) + ' à l\'année.';

      updateChart(charts.week, costPerWeek, costPerWeek, costPerMonth, costPerYear);
      updateChart(charts.month, costPerMonth, costPerWeek, costPerMonth, costPerYear);
      updateChart(charts.year, costPerYear, costPerWeek, costPerMonth, costPerYear);
    });
  }

  /**
   * Retrieve and validate input values.
   *
   * @param {Object} fields Input and error nodes.
   * @returns {Object}
   */
  function getInputValues(inputs) {
    var fields = inputs.fields;
    var advanced = inputs.advanced || {};
    var tipElement = inputs.advancedTip || null;
    var hasError = false;
    var dailyKm = parseInputValue(fields.daily_km.input);
    var consumption = parseInputValue(fields.consumption.input);
    var price = parseInputValue(fields.price.input);

    if (!isValidPositiveNumber(dailyKm)) {
      hasError = true;
      showError(fields.daily_km, 'Veuillez saisir une valeur supérieure à 0.');
    } else {
      clearError(fields.daily_km);
    }

    if (!isValidPositiveNumber(consumption)) {
      hasError = true;
      showError(fields.consumption, 'Veuillez saisir une valeur supérieure à 0.');
    } else {
      clearError(fields.consumption);
    }

    var priceValid = isValidPositiveNumber(price);

    var advancedUsed = false;
    var advancedValid = true;
    var weightedSum = 0;
    var totalRatio = 0;
    var totalPercentage = 0;

    Object.keys(advanced).forEach(function (key) {
      var config = advanced[key];

      if (!config || !config.checkbox || !config.checkbox.checked) {
        if (config && config.percentage) {
          clearError(config.percentage);
        }
        if (config && config.price) {
          clearError(config.price);
        }
        return;
      }

      advancedUsed = true;

      var percentage = parseInputValue(config.percentage ? config.percentage.input : null);
      var priceValue = parseInputValue(config.price ? config.price.input : null);

      if (!isValidPercentage(percentage)) {
        hasError = true;
        advancedValid = false;
        showError(config.percentage, 'Pourcentage entre 0 et 100 requis.');
      } else {
        clearError(config.percentage);
      }

      if (!isValidPositiveNumber(priceValue)) {
        hasError = true;
        advancedValid = false;
        showError(config.price, 'Indiquez un prix supérieur à 0.');
      } else {
        clearError(config.price);
      }

      if (isValidPercentage(percentage) && isValidPositiveNumber(priceValue)) {
        var ratio = percentage / 100;
        weightedSum += priceValue * ratio;
        totalRatio += ratio;
        totalPercentage += percentage;
      }
    });

    if (advancedUsed) {
      if (totalPercentage <= 0) {
        hasError = true;
        advancedValid = false;
        updateAdvancedTip(tipElement, 'Renseignez des pourcentages supérieurs à 0 pour utiliser ces options.');
      } else if (Math.abs(totalPercentage - 100) > 0.5) {
        updateAdvancedTip(tipElement, 'Astuce : pour un résultat plus précis, faites en sorte que le total fasse 100 %. Total actuel : ' + totalPercentage.toFixed(0) + ' %.');
      } else {
        updateAdvancedTip(tipElement, 'Répartition totale : ' + totalPercentage.toFixed(0) + ' %.');
      }
    } else {
      updateAdvancedTip(tipElement, '');
    }

    var useAdvanced = advancedUsed && advancedValid && totalRatio > 0;
    var effectivePrice = price;

    if (useAdvanced) {
      effectivePrice = totalRatio > 0 ? (weightedSum / totalRatio) : price;
      clearError(fields.price);
    } else if (!priceValid) {
      hasError = true;
      showError(fields.price, 'Veuillez saisir une valeur supérieure à 0.');
    } else {
      clearError(fields.price);
    }

    return {
      isValid: !hasError,
      dailyKm: hasError ? 0 : dailyKm,
      consumption: hasError ? 0 : consumption,
      price: hasError ? 0 : effectivePrice,
      useAdvanced: useAdvanced
    };
  }

  /**
   * Determine if a value is a valid positive number.
   *
   * @param {number} value Value to check.
   * @returns {boolean}
   */
  function isValidPositiveNumber(value) {
    return typeof value === 'number' && !isNaN(value) && value > 0;
  }

  /**
   * Determine if a value is a valid percentage between 0 and 100.
   *
   * @param {number} value Value to check.
   * @returns {boolean}
   */
  function isValidPercentage(value) {
    return typeof value === 'number' && !isNaN(value) && value >= 0 && value <= 100;
  }

  /**
   * Update advanced repartition tip helper.
   *
   * @param {HTMLElement|null} tipElement
   * @param {string} message
   */
  function updateAdvancedTip(tipElement, message) {
    if (!tipElement) {
      return;
    }

    tipElement.textContent = message;
  }

  /**
   * Display an error under an input.
   *
   * @param {Object} field Field object containing input and error nodes.
   * @param {string} message Error message.
   */
  function showError(field, message) {
    if (!field || !field.input) {
      return;
    }

    field.input.classList.add('mbapro-ev-calculator__input--error');
    if (field.error) {
      field.error.textContent = message;
    }
  }

  /**
   * Clear an error under an input.
   *
   * @param {Object} field Field object containing input and error nodes.
   */
  function clearError(field) {
    if (!field || !field.input) {
      return;
    }

    field.input.classList.remove('mbapro-ev-calculator__input--error');
    if (field.error) {
      field.error.textContent = '';
    }
  }

  /**
   * Update the chart for a given period.
   *
   * @param {Object} chart Chart object with bar and value elements.
   * @param {number} value Current value for the period.
   * @param {number} week Week value.
   * @param {number} month Month value.
   * @param {number} year Year value.
   */
  function updateChart(chart, value, week, month, year) {
    if (!chart || !chart.bar || !chart.value) {
      return;
    }

    var max = Math.max(week, month, year);
    var width = max > 0 ? (value / max) * 100 : 0;

    chart.bar.style.width = width + '%';
    chart.value.textContent = formatCurrency(value);
  }

  /**
   * Initialise calculator blocks.
   */
  document.addEventListener('DOMContentLoaded', function () {
    var calculators = document.querySelectorAll('[data-mbapro-ev-calculator]');

    calculators.forEach(function (calculator) {
      var form = calculator.querySelector('[data-mbapro-ev-calculator-form]');
      var results = calculator.querySelector('[data-mbapro-ev-results]');

      if (!form || !results) {
        return;
      }

      var homeCheckbox = form.querySelector('[data-mbapro-ev-advanced-select="home"]');
      var publicCheckbox = form.querySelector('[data-mbapro-ev-advanced-select="public"]');
      var workCheckbox = form.querySelector('[data-mbapro-ev-advanced-select="work"]');

      var inputs = {
        fields: {
          daily_km: {
            input: form.querySelector('[data-mbapro-ev-input="daily_km"]'),
            error: form.querySelector('[data-mbapro-ev-error="daily_km"]')
          },
          consumption: {
            input: form.querySelector('[data-mbapro-ev-input="consumption"]'),
            error: form.querySelector('[data-mbapro-ev-error="consumption"]')
          },
          price: {
            input: form.querySelector('[data-mbapro-ev-input="price"]'),
            error: form.querySelector('[data-mbapro-ev-error="price"]')
          }
        },
        advanced: {
          home: {
            checkbox: homeCheckbox,
            label: homeCheckbox ? homeCheckbox.closest('.mbapro-ev-calculator__advanced-selector') : null,
            group: form.querySelector('[data-mbapro-ev-advanced-group="home"]'),
            percentage: {
              input: form.querySelector('[data-mbapro-ev-input="home_percentage"]'),
              error: form.querySelector('[data-mbapro-ev-error="home_percentage"]')
            },
            price: {
              input: form.querySelector('[data-mbapro-ev-input="home_price"]'),
              error: form.querySelector('[data-mbapro-ev-error="home_price"]')
            }
          },
          public: {
            checkbox: publicCheckbox,
            label: publicCheckbox ? publicCheckbox.closest('.mbapro-ev-calculator__advanced-selector') : null,
            group: form.querySelector('[data-mbapro-ev-advanced-group="public"]'),
            percentage: {
              input: form.querySelector('[data-mbapro-ev-input="public_percentage"]'),
              error: form.querySelector('[data-mbapro-ev-error="public_percentage"]')
            },
            price: {
              input: form.querySelector('[data-mbapro-ev-input="public_price"]'),
              error: form.querySelector('[data-mbapro-ev-error="public_price"]')
            }
          },
          work: {
            checkbox: workCheckbox,
            label: workCheckbox ? workCheckbox.closest('.mbapro-ev-calculator__advanced-selector') : null,
            group: form.querySelector('[data-mbapro-ev-advanced-group="work"]'),
            percentage: {
              input: form.querySelector('[data-mbapro-ev-input="work_percentage"]'),
              error: form.querySelector('[data-mbapro-ev-error="work_percentage"]')
            },
            price: {
              input: form.querySelector('[data-mbapro-ev-input="work_price"]'),
              error: form.querySelector('[data-mbapro-ev-error="work_price"]')
            }
          }
        },
        advancedTip: form.querySelector('[data-mbapro-ev-advanced-tip]'),
        calculateButton: form.querySelector('[data-mbapro-ev-calculate]')
      };

      var outputs = {
        per_100km: results.querySelector('[data-mbapro-ev-output="per_100km"]'),
        per_day: results.querySelector('[data-mbapro-ev-output="per_day"]'),
        per_week: results.querySelector('[data-mbapro-ev-output="per_week"]'),
        per_month: results.querySelector('[data-mbapro-ev-output="per_month"]'),
        per_year: results.querySelector('[data-mbapro-ev-output="per_year"]')
      };

      var subs = {
        per_day: results.querySelector('[data-mbapro-ev-sub="per_day"]'),
        per_week: results.querySelector('[data-mbapro-ev-sub="per_week"]'),
        per_month: results.querySelector('[data-mbapro-ev-sub="per_month"]'),
        per_year: results.querySelector('[data-mbapro-ev-sub="per_year"]')
      };

      var charts = {
        week: mapChart(results.querySelector('[data-mbapro-ev-chart="week"]')),
        month: mapChart(results.querySelector('[data-mbapro-ev-chart="month"]')),
        year: mapChart(results.querySelector('[data-mbapro-ev-chart="year"]'))
      };

      bindAdvancedToggle(
        form.querySelector('[data-mbapro-ev-advanced-toggle]'),
        form.querySelector('[data-mbapro-ev-advanced]')
      );

      bindAdvancedGroups(inputs.advanced, inputs.advancedTip);

      bindCalculator(inputs, outputs, subs, charts);
    });
  });

  /**
   * Map chart DOM structure to an object.
   *
   * @param {HTMLElement|null} element Chart wrapper.
   * @returns {{bar: HTMLElement, value: HTMLElement}|null}
   */
  function mapChart(element) {
    if (!element) {
      return null;
    }

    return {
      bar: element.querySelector('.mbapro-ev-calculator__chart-bar'),
      value: element.querySelector('.mbapro-ev-calculator__chart-value')
    };
  }

  // Expose namespace for potential extensions.
  window.MBAPRO_EvCalculator = {
    formatCurrency: formatCurrency
  };
})();
