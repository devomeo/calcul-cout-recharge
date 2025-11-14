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
   * Toggle helper for advanced fields.
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

    toggle.addEventListener('click', function () {
      container.classList.toggle('is-visible');

      var isVisible = container.classList.contains('is-visible');
      toggle.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
      container.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    });
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
      var values = getInputValues(inputs.fields);

      if (!values.isValid) {
        return;
      }

      var kWhPerDay = (values.dailyKm * values.consumption) / 100;
      var pricePerKWh = values.price;

      if (values.useAdvanced) {
        var homeRatio = values.homePercentage / 100;
        var publicRatio = 1 - homeRatio;
        pricePerKWh = (values.homePrice * homeRatio) + (values.publicPrice * publicRatio);
      }

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
  function getInputValues(fields) {
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

    if (!isValidPositiveNumber(price)) {
      hasError = true;
      showError(fields.price, 'Veuillez saisir une valeur supérieure à 0.');
    } else {
      clearError(fields.price);
    }

    var homePercentage = parseInputValue(fields.home_percentage.input);
    var homePrice = parseInputValue(fields.home_price.input);
    var publicPrice = parseInputValue(fields.public_price.input);

    var useAdvanced = !isNaN(homePercentage) && homePercentage >= 0 && homePercentage <= 100 &&
      isValidPositiveNumber(homePrice) &&
      isValidPositiveNumber(publicPrice);

    return {
      isValid: !hasError,
      dailyKm: hasError ? 0 : dailyKm,
      consumption: hasError ? 0 : consumption,
      price: hasError ? 0 : price,
      homePercentage: useAdvanced ? homePercentage : 0,
      homePrice: useAdvanced ? homePrice : 0,
      publicPrice: useAdvanced ? publicPrice : 0,
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
          },
          home_percentage: {
            input: form.querySelector('[data-mbapro-ev-input="home_percentage"]'),
            error: null
          },
          home_price: {
            input: form.querySelector('[data-mbapro-ev-input="home_price"]'),
            error: null
          },
          public_price: {
            input: form.querySelector('[data-mbapro-ev-input="public_price"]'),
            error: null
          }
        },
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
