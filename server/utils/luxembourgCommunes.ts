import type { LuxembourgCommune } from '@/types/booking'

/**
 * Luxembourg communes whose centre lies within 35 km of the depot, located at the centroid of
 * their official boundary.
 */
export const LUXEMBOURG_COMMUNES: readonly LuxembourgCommune[] = [
  { name: 'Bertrange', latitude: 49.601259, longitude: 6.041042 },
  { name: 'Bettembourg', latitude: 49.521284, longitude: 6.084253 },
  { name: 'Bous-Waldbredimus', latitude: 49.561662, longitude: 6.307191 },
  { name: 'Contern', latitude: 49.588982, longitude: 6.245095 },
  { name: 'Dalheim', latitude: 49.54342, longitude: 6.260597 },
  { name: 'Differdange', latitude: 49.521624, longitude: 5.88115 },
  { name: 'Dippach', latitude: 49.584103, longitude: 5.974181 },
  { name: 'Dudelange', latitude: 49.482403, longitude: 6.088807 },
  { name: 'Esch-sur-Alzette', latitude: 49.493091, longitude: 5.978882 },
  { name: 'Frisange', latitude: 49.515061, longitude: 6.189138 },
  { name: 'Hesperange', latitude: 49.577545, longitude: 6.166406 },
  { name: 'Kayl', latitude: 49.482077, longitude: 6.033741 },
  { name: 'Leudelange', latitude: 49.567976, longitude: 6.06793 },
  { name: 'Luxembourg', latitude: 49.613579, longitude: 6.126444 },
  { name: 'Mondercange', latitude: 49.53176, longitude: 6.010614 },
  { name: 'Mondorf-les-Bains', latitude: 49.516097, longitude: 6.282109 },
  { name: 'Pétange', latitude: 49.549477, longitude: 5.854574 },
  { name: 'Reckange-sur-Mess', latitude: 49.560286, longitude: 6.011164 },
  { name: 'Remich', latitude: 49.547866, longitude: 6.360266 },
  { name: 'Roeser', latitude: 49.537608, longitude: 6.130637 },
  { name: 'Rumelange', latitude: 49.461284, longitude: 6.012194 },
  { name: 'Sandweiler', latitude: 49.615315, longitude: 6.215058 },
  { name: 'Sanem', latitude: 49.531337, longitude: 5.937808 },
  { name: 'Schengen', latitude: 49.498456, longitude: 6.335256 },
  { name: 'Schifflange', latitude: 49.506442, longitude: 6.014978 },
  { name: 'Stadtbredimus', latitude: 49.580817, longitude: 6.349496 },
  { name: 'Weiler-la-Tour', latitude: 49.546905, longitude: 6.199584 },
]
