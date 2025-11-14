<?php
/**
 * Plugin Name: MBAPRO EV Cost Calculator
 * Plugin URI: https://mbapro.fr/
 * Description: Calculateur de coût de recharge pour véhicule électrique avec interface MBAPRO.
 * Version: 1.0.0
 * Author: MBAPRO
 * Author URI: https://mbapro.fr/
 * License: GPL-2.0-or-later
 * Text Domain: mbapro-ev-cost-calculator
 *
 * @package MBAPRO_Ev_Cost_Calculator
 */

if ( ! defined( 'ABSPATH' ) ) {
exit;
}

if ( ! class_exists( 'MBAPRO_Ev_Cost_Calculator' ) ) {
/**
 * Main plugin class.
 */
class MBAPRO_Ev_Cost_Calculator {
/**
 * Plugin version.
 *
 * @var string
 */
const VERSION = '1.0.0';

/**
 * Shortcode slug.
 *
 * @var string
 */
private $shortcode = 'mbapro_ev_calculator';

/**
 * Plugin instance.
 *
 * @var MBAPRO_Ev_Cost_Calculator|null
 */
private static $instance = null;

/**
 * Plugin URL.
 *
 * @var string
 */
private $plugin_url;

/**
 * Retrieve singleton instance.
 *
 * @return MBAPRO_Ev_Cost_Calculator
 */
public static function get_instance() {
if ( null === self::$instance ) {
self::$instance = new self();
}

return self::$instance;
}

/**
 * Constructor.
 */
private function __construct() {
$this->plugin_url = plugin_dir_url( __FILE__ );

add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ) );
add_shortcode( $this->shortcode, array( $this, 'render_shortcode' ) );
}

/**
 * Register plugin assets without enqueuing them.
 *
 * @return void
 */
public function register_assets() {
wp_register_style(
'mbapro-ev-calculator-style',
$this->plugin_url . 'assets/css/mbapro-ev-calculator.css',
array(),
self::VERSION
);

wp_register_script(
'mbapro-ev-calculator-script',
$this->plugin_url . 'assets/js/mbapro-ev-calculator.js',
array(),
self::VERSION,
true
);
}

/**
 * Render shortcode output.
 *
 * @return string
 */
public function render_shortcode() {
wp_enqueue_style( 'mbapro-ev-calculator-style' );
wp_enqueue_script( 'mbapro-ev-calculator-script' );

wp_localize_script(
'mbapro-ev-calculator-script',
'MBAPROEvCalculatorConfig',
array(
'currency' => '€',
)
);

ob_start();
?>
<div class="mbapro-ev-calculator" data-mbapro-ev-calculator>
<div class="mbapro-ev-calculator__header">
<h2 class="mbapro-ev-calculator__title">Calculez le coût de vos recharges</h2>
<p class="mbapro-ev-calculator__subtitle">Simulez votre budget recharge sur une semaine, un mois et une année.</p>
</div>

<div class="mbapro-ev-calculator__content">
<div class="mbapro-ev-calculator__form" data-mbapro-ev-calculator-form>
<h3 class="mbapro-ev-calculator__section-title">Vos paramètres</h3>
<div class="mbapro-ev-calculator__field">
<label for="mbapro-ev-daily-km" class="mbapro-ev-calculator__label">Kilométrage moyen par jour (km)</label>
<input type="number" min="0" step="0.1" id="mbapro-ev-daily-km" class="mbapro-ev-calculator__input" placeholder="ex : 50" data-mbapro-ev-input="daily_km" />
<small class="mbapro-ev-calculator__error" data-mbapro-ev-error="daily_km"></small>
</div>
<div class="mbapro-ev-calculator__field">
<label for="mbapro-ev-consumption" class="mbapro-ev-calculator__label">Consommation du véhicule (kWh / 100 km)</label>
<input type="number" min="0" step="0.1" id="mbapro-ev-consumption" class="mbapro-ev-calculator__input" placeholder="ex : 15" data-mbapro-ev-input="consumption" />
<small class="mbapro-ev-calculator__error" data-mbapro-ev-error="consumption"></small>
</div>
<div class="mbapro-ev-calculator__field">
<label for="mbapro-ev-electricity-price" class="mbapro-ev-calculator__label">Prix de l'électricité (€/kWh)</label>
<input type="number" min="0" step="0.01" id="mbapro-ev-electricity-price" class="mbapro-ev-calculator__input" placeholder="ex : 0,20" data-mbapro-ev-input="price" />
<small class="mbapro-ev-calculator__error" data-mbapro-ev-error="price"></small>
</div>

<div class="mbapro-ev-calculator__advanced">
<button type="button" class="mbapro-ev-calculator__advanced-toggle" data-mbapro-ev-advanced-toggle aria-expanded="false">Options avancées</button>
<div class="mbapro-ev-calculator__advanced-fields" data-mbapro-ev-advanced aria-hidden="true">
<p class="mbapro-ev-calculator__advanced-note">Affinez votre estimation en indiquant la répartition des recharges.</p>
<div class="mbapro-ev-calculator__field">
<label for="mbapro-ev-home-percentage" class="mbapro-ev-calculator__label">Pourcentage de recharge à domicile (%)</label>
<input type="number" min="0" max="100" step="1" id="mbapro-ev-home-percentage" class="mbapro-ev-calculator__input" placeholder="ex : 70" data-mbapro-ev-input="home_percentage" />
</div>
<div class="mbapro-ev-calculator__field">
<label for="mbapro-ev-home-price" class="mbapro-ev-calculator__label">Prix électricité domicile (€/kWh)</label>
<input type="number" min="0" step="0.01" id="mbapro-ev-home-price" class="mbapro-ev-calculator__input" placeholder="ex : 0,18" data-mbapro-ev-input="home_price" />
</div>
<div class="mbapro-ev-calculator__field">
<label for="mbapro-ev-public-price" class="mbapro-ev-calculator__label">Prix électricité borne publique (€/kWh)</label>
<input type="number" min="0" step="0.01" id="mbapro-ev-public-price" class="mbapro-ev-calculator__input" placeholder="ex : 0,32" data-mbapro-ev-input="public_price" />
</div>
</div>
</div>

<button type="button" class="mbapro-ev-calculator__button" data-mbapro-ev-calculate>Calculer</button>
</div>

<div class="mbapro-ev-calculator__results" data-mbapro-ev-results>
<h3 class="mbapro-ev-calculator__section-title">Vos résultats</h3>
<div class="mbapro-ev-calculator__key-figure">
<span class="mbapro-ev-calculator__key-figure-label">Coût pour 100 km</span>
<span class="mbapro-ev-calculator__key-figure-value" data-mbapro-ev-output="per_100km">—</span>
</div>
<div class="mbapro-ev-calculator__cards">
<div class="mbapro-ev-calculator__card">
<h4 class="mbapro-ev-calculator__card-title">Par jour</h4>
<div class="mbapro-ev-calculator__card-value" data-mbapro-ev-output="per_day">—</div>
<p class="mbapro-ev-calculator__card-sub" data-mbapro-ev-sub="per_day">Base de calcul quotidienne.</p>
</div>
<div class="mbapro-ev-calculator__card">
<h4 class="mbapro-ev-calculator__card-title">Par semaine</h4>
<div class="mbapro-ev-calculator__card-value" data-mbapro-ev-output="per_week">—</div>
<p class="mbapro-ev-calculator__card-sub" data-mbapro-ev-sub="per_week">Projection sur 7 jours.</p>
</div>
<div class="mbapro-ev-calculator__card">
<h4 class="mbapro-ev-calculator__card-title">Par mois</h4>
<div class="mbapro-ev-calculator__card-value" data-mbapro-ev-output="per_month">—</div>
<p class="mbapro-ev-calculator__card-sub" data-mbapro-ev-sub="per_month">Estimation sur 30 jours.</p>
</div>
<div class="mbapro-ev-calculator__card">
<h4 class="mbapro-ev-calculator__card-title">Par an</h4>
<div class="mbapro-ev-calculator__card-value" data-mbapro-ev-output="per_year">—</div>
<p class="mbapro-ev-calculator__card-sub" data-mbapro-ev-sub="per_year">Projection sur 365 jours.</p>
</div>
</div>

<div class="mbapro-ev-calculator__chart">
<h4 class="mbapro-ev-calculator__chart-title">Comparatif visuel</h4>
<div class="mbapro-ev-calculator__chart-item" data-mbapro-ev-chart="week">
<span class="mbapro-ev-calculator__chart-label">Semaine</span>
<div class="mbapro-ev-calculator__chart-track">
<div class="mbapro-ev-calculator__chart-bar" style="width:0%"></div>
</div>
<span class="mbapro-ev-calculator__chart-value">—</span>
</div>
<div class="mbapro-ev-calculator__chart-item" data-mbapro-ev-chart="month">
<span class="mbapro-ev-calculator__chart-label">Mois</span>
<div class="mbapro-ev-calculator__chart-track">
<div class="mbapro-ev-calculator__chart-bar" style="width:0%"></div>
</div>
<span class="mbapro-ev-calculator__chart-value">—</span>
</div>
<div class="mbapro-ev-calculator__chart-item" data-mbapro-ev-chart="year">
<span class="mbapro-ev-calculator__chart-label">Année</span>
<div class="mbapro-ev-calculator__chart-track">
<div class="mbapro-ev-calculator__chart-bar" style="width:0%"></div>
</div>
<span class="mbapro-ev-calculator__chart-value">—</span>
</div>
</div>
</div>
</div>
</div>
<?php

return ob_get_clean();
}
}

MBAPRO_Ev_Cost_Calculator::get_instance();
}
