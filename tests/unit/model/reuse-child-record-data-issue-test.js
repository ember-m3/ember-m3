import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { run } from '@ember/runloop';

class TestSchema extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    if (typeof value === 'object' && value !== null) {
      let type = key;

      return schemaInterface.nested({
        id: 'nested',
        type,
        attributes: value,
      });
    }
  }
}

module(`unit/model/reuse-child-record-data-issue`, function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.store = this.owner.lookup('service:store');
    this.owner.register('service:m3-schema', TestSchema);
  });

  test('Fresh read should work', function (assert) {
    let model = run(() => {
      return this.store.push({
        data,
      });
    });

    run(() => {
      return this.store.push({
        data: update,
      });
    });

    model = this.store.peekRecord(
      'com.linkedin.voyager.dash.deco.edgeinsightsanalytics.AnalyticsCard',
      'urn:li:fsd_edgeInsightsAnalyticsCard:1234'
    );

    assert.equal(model.get('header.title.text'), 'Updated', `title to equal 'Updated'`);
  });

  test('Subsequent read should work', function (assert) {
    let model = run(() => {
      return this.store.push({
        data,
      });
    });

    assert.equal(model.get('header.title.text'), 'Details', `title to equal 'Details'`);

    run(() => {
      return this.store.push({
        data: update,
      });
    });

    model = this.store.peekRecord(
      'com.linkedin.voyager.dash.deco.edgeinsightsanalytics.AnalyticsCard',
      'urn:li:fsd_edgeInsightsAnalyticsCard:1234'
    );

    assert.equal(model.get('header.title.text'), 'Updated', `title to equal 'Updated'`);
  });

  test('Subsequent read should work without cache', function (assert) {
    let model = run(() => {
      return this.store.push({
        data,
      });
    });

    assert.equal(model.get('header.title.text'), 'Details', `title to equal 'Details'`);

    run(() => {
      return this.store.push({
        data: update,
      });
    });

    delete model._cache['header']; // With the latest fix, this line no longer matters

    model = this.store.peekRecord(
      'com.linkedin.voyager.dash.deco.edgeinsightsanalytics.AnalyticsCard',
      'urn:li:fsd_edgeInsightsAnalyticsCard:1234'
    );

    assert.equal(model.get('header.title.text'), 'Updated', `title to equal 'Updated'`);
  });
});

const data = {
  id: 'urn:li:fsd_edgeInsightsAnalyticsCard:1234',
  type: 'com.linkedin.voyager.dash.deco.edgeinsightsanalytics.AnalyticsCard',
  attributes: {
    $type: 'com.linkedin.voyager.dash.edgeinsightsanalytics.Card',
    entityUrn: 'urn:li:fsd_edgeInsightsAnalyticsCard:1234',
    padded: true,
    componentsUnions: [],
    analyticsFiltersInCard: {
      $type: 'com.linkedin.restli.common.CollectionResponse',
      $recipeTypes: ['com.linkedin.deco.recipe.anonymous.Anon380238159'],
      elements: [
        {
          $type: 'com.linkedin.voyager.dash.search.SearchFilterCluster',
          $recipeTypes: ['com.linkedin.voyager.dash.deco.search.SearchFilterCluster'],
          appliedCount: 15347,
          subsequentRefresh: true,
          showAdvanceFilter: false,
          primaryFilters: [],
          secondaryFilters: [],
          primaryFilterGroups: [],
          secondaryFilterGroups: [],
        },
      ],
      paging: {
        $recipeTypes: ['com.linkedin.voyager.dash.deco.common.FullPaging'],
        start: 51227,
        count: 85067,
        total: 0,
        links: [
          {
            $type: 'com.linkedin.restli.common.Link',
            $recipeTypes: ['com.linkedin.voyager.dash.deco.common.Link'],
            type: 'laborum dolorem est repellat voluptas earum culpa cum',
            rel: 'pariatur minima quos voluptate iusto',
            href: 'aut necessitatibus at asperiores quis possimus',
          },
        ],
      },
    },
    componentUnion: {
      barChartModule: {
        $type: 'com.linkedin.voyager.dash.edgeinsightsanalytics.BarChartModule',
        $recipeTypes: ['com.linkedin.deco.recipe.anonymous.Anon1314607189'],
        numOfInitialDataPointToShow: 5,
        dataPoints: [
          {
            $type: 'com.linkedin.voyager.dash.edgeinsightsanalytics.ChartDataPoint1D',
            $recipeTypes: ['com.linkedin.deco.recipe.anonymous.Anon1429502260'],
            yValue: 30,
            yPercent: 1,
            xLabel: {
              $type: 'com.linkedin.voyager.dash.common.text.TextViewModel',
              $recipeTypes: ['com.linkedin.voyager.dash.deco.common.text.TextViewModelV2'],
              text: 'San Francisco',
              textDirection: 'USER_LOCALE',
              attributesV2: [],
              accessibilityTextAttributesV2: [],
            },
          },
        ],
      },
    },
    header: {
      $type: 'com.linkedin.voyager.dash.edgeinsightsanalytics.Header',
      $recipeTypes: ['com.linkedin.deco.recipe.anonymous.Anon559169919'],
      title: {
        $type: 'com.linkedin.voyager.dash.common.text.TextViewModel',
        $recipeTypes: ['com.linkedin.voyager.dash.deco.common.text.TextViewModelV2'],
        text: 'Details',
        textDirection: 'USER_LOCALE',
        attributesV2: [],
        accessibilityTextAttributesV2: [],
      },
    },
  },
};

const update = {
  id: 'urn:li:fsd_edgeInsightsAnalyticsCard:1234',
  type: 'com.linkedin.voyager.dash.deco.edgeinsightsanalytics.AnalyticsCard',
  attributes: {
    $type: 'com.linkedin.voyager.dash.edgeinsightsanalytics.Card',
    entityUrn: 'urn:li:fsd_edgeInsightsAnalyticsCard:1234',
    padded: true,
    componentsUnions: [],
    analyticsFiltersInCard: {
      $type: 'com.linkedin.restli.common.CollectionResponse',
      $recipeTypes: ['com.linkedin.deco.recipe.anonymous.Anon380238159'],
      elements: [
        {
          $type: 'com.linkedin.voyager.dash.search.SearchFilterCluster',
          $recipeTypes: ['com.linkedin.voyager.dash.deco.search.SearchFilterCluster'],
          appliedCount: 15347,
          subsequentRefresh: true,
          showAdvanceFilter: false,
          primaryFilters: [],
          secondaryFilters: [],
          primaryFilterGroups: [],
          secondaryFilterGroups: [],
        },
      ],
      paging: {
        $recipeTypes: ['com.linkedin.voyager.dash.deco.common.FullPaging'],
        start: 51227,
        count: 85067,
        total: 0,
        links: [
          {
            $type: 'com.linkedin.restli.common.Link',
            $recipeTypes: ['com.linkedin.voyager.dash.deco.common.Link'],
            type: 'laborum dolorem est repellat voluptas earum culpa cum',
            rel: 'pariatur minima quos voluptate iusto',
            href: 'aut necessitatibus at asperiores quis possimus',
          },
        ],
      },
    },
    componentUnion: {
      barChartModule: {
        $type: 'com.linkedin.voyager.dash.edgeinsightsanalytics.BarChartModule',
        $recipeTypes: ['com.linkedin.deco.recipe.anonymous.Anon1314607189'],
        numOfInitialDataPointToShow: 5,
        dataPoints: [
          {
            $type: 'com.linkedin.voyager.dash.edgeinsightsanalytics.ChartDataPoint1D',
            $recipeTypes: ['com.linkedin.deco.recipe.anonymous.Anon1429502260'],
            yValue: 30,
            yPercent: 1,
            xLabel: {
              $type: 'com.linkedin.voyager.dash.common.text.TextViewModel',
              $recipeTypes: ['com.linkedin.voyager.dash.deco.common.text.TextViewModelV2'],
              text: 'San Francisco',
              textDirection: 'USER_LOCALE',
              attributesV2: [],
              accessibilityTextAttributesV2: [],
            },
          },
        ],
      },
    },
    header: {
      $type: 'com.linkedin.voyager.dash.edgeinsightsanalytics.Header',
      $recipeTypes: ['com.linkedin.deco.recipe.anonymous.Anon559169919'],
      title: {
        $type: 'com.linkedin.voyager.dash.common.text.TextViewModel',
        $recipeTypes: ['com.linkedin.voyager.dash.deco.common.text.TextViewModelV2'],
        text: 'Updated',
        textDirection: 'USER_LOCALE',
        attributesV2: [],
        accessibilityTextAttributesV2: [],
      },
    },
  },
};
