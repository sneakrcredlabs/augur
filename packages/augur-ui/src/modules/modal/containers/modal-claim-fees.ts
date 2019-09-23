import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { AppState } from 'store';
import { selectMarket } from 'modules/markets/selectors/market';
import { createBigNumber } from 'utils/create-big-number';
import { getGasPrice } from 'modules/auth/selectors/get-gas-price';
import {
  formatGasCostToEther,
  formatAttoRep,
  formatAttoEth,
  formatEther,
  formatRep,
  formatAttoDai,
} from 'utils/format-number';
import { closeModal } from 'modules/modal/actions/close-modal';
import { Proceeds } from 'modules/modal/proceeds';
import { ActionRowsProps } from 'modules/modal/common';
import {
  CLAIM_FEES_GAS_COST,
  redeemStake,
} from 'modules/reporting/actions/claim-reporting-fees';
import {
  ALL,
  CLAIM_FEE_WINDOWS,
  CLAIM_STAKE_FEES,
} from 'modules/common/constants';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';

const mapStateToProps = (state: AppState, ownProps) => {
  const accountReporting = state.loginAccount.reporting;
  // need to accum marketIds
  return {
    modal: state.modal,
    gasCost: formatGasCostToEther(
      CLAIM_FEES_GAS_COST,
      { decimalsRounded: 4 },
      getGasPrice(state)
    ),
    pendingQueue: state.pendingQueue || [],
    totalUnclaimedDaiFormatted: ownProps.unclaimedDai,
    totalUnclaimedRepFormatted: ownProps.unclaimedRep,
    accountReporting,
  };
};

const mapDispatchToProps = (dispatch: ThunkDispatch<void, any, Action>) => ({
  closeModal: () => dispatch(closeModal()),
  redeemStake: (options, callback) => dispatch(redeemStake(options, callback)),
});

const mergeProps = (sP: any, dP: any, oP: any) => {
  const totalUnclaimedDaiFormatted = sP.totalUnclaimedDaiFormatted;
  const totalUnclaimedRepFormatted = sP.totalUnclaimedRepFormatted;
  const marketIdsToTest = sP.nonforkedMarkets;
  const markets: ActionRowsProps[] = [];
  const claimableMarkets: any = [];
  let unclaimedRep = createBigNumber(sP.modal.unclaimedRep.fullPrecision);
  let unclaimedDai = createBigNumber(sP.modal.unclaimedDai.fullPrecision);
  marketIdsToTest.forEach(marketObj => {
    const market = selectMarket(marketObj.marketId);
    const daiFees = formatAttoDai(marketObj.unclaimedDaiFees);
    const total = createBigNumber(daiFees.fullPrecision);

    if (market) {
      const marketRep = formatAttoRep(marketObj.unclaimedRepTotal, {
        decimals: 4,
        decimalsRounded: 4,
        zeroStyled: false,
      });

      const pending =
        sP.pendingQueue[CLAIM_STAKE_FEES] &&
        sP.pendingQueue[CLAIM_STAKE_FEES][marketObj.marketId];
      if (!pending) {
        claimableMarkets.push(marketObj);
      } else {
        unclaimedRep = unclaimedRep.minus(
          createBigNumber(marketRep.fullPrecision)
        );
        unclaimedDai = unclaimedDai.minus(
          createBigNumber(daiFees.fullPrecision)
        );
      }

      markets.push({
        title: market.description,
        text: 'Claim Proceeds',
        status: pending && pending.status,
        properties: [
          {
            label: 'reporting stake',
            value: `${marketRep.formatted || 0} REP`,
            addExtraSpace: true,
          },
          {
            label: 'Reporting Fees',
            value: `${daiFees.formatted || 0} DAI`,
          },
          {
            label: 'est gas cost',
            value: `${marketObj.gasCost} ETH`,
          },
          {
            label: 'total dai',
            value: `${formatEther(createBigNumber(total).abs()).formatted} DAI`,
          },
        ],
        action: () => {
          const marketIndex = sP.reportingFees.nonforkedMarkets.findIndex(
            market => market.marketId === marketObj.marketId
          );
          const RedeemStakeOptions = {
            disputeWindows: [],
            nonforkedMarkets: [sP.nonforkedMarkets[marketIndex]],
            pendingId: sP.nonforkedMarkets[marketIndex].marketId,
          };
          dP.redeemStake(RedeemStakeOptions);
        },
      });
    }
  });
  let feeWindowsPending = false;
  if (sP.disputeWindows.length > 0) {
    const totalMinusGas = createBigNumber(
      sP.reportingFees.unclaimedParticipationTokenDaiFees.fullPrecision
    )
      .minus(createBigNumber(sP.reportingFees.gasCosts[CLAIM_FEE_WINDOWS]))
      .abs();

    feeWindowsPending =
      sP.pendingQueue[CLAIM_STAKE_FEES] &&
      sP.pendingQueue[CLAIM_STAKE_FEES][CLAIM_FEE_WINDOWS];

    if (feeWindowsPending) {
      unclaimedRep = unclaimedRep.minus(
        createBigNumber(
          sP.reportingFees.participationTokenRepStaked.fullPrecision
        )
      );
      unclaimedDai = unclaimedDai.minus(
        createBigNumber(
          sP.reportingFees.unclaimedParticipationTokenDaiFees.fullPrecision
        )
      );
    }

    markets.push({
      title: 'Reedeem all participation tokens',
      text: 'Claim',
      status: feeWindowsPending,
      properties: [
        {
          label: 'Reporting Stake',
          value: `${sP.reportingFees.participationTokenRepStaked.formatted} REP`,
          addExtraSpace: true,
        },
        {
          label: 'Reporting Fees',
          value: `${sP.reportingFees.unclaimedParticipationTokenDaiFees.formatted} ETH`,
        },
        {
          label: 'Est Gas cost',
          value: `${
            formatEther(sP.reportingFees.gasCosts[CLAIM_FEE_WINDOWS]).formatted
          } ETH`,
        },
        {
          label: 'Total Eth',
          value: `${formatEther(totalMinusGas).formatted} ETH`,
        },
      ],
      action: () => {
        const RedeemStakeOptions = {
          disputeWindows: sP.disputeWindows,
          nonforkedMarkets: [],
          pendingId: CLAIM_FEE_WINDOWS,
        };
        dP.redeemStake(RedeemStakeOptions);
      },
    });
  }

  const breakdown =
    markets.length > 1
      ? [
          {
            label: 'Total REP',
            value: totalUnclaimedRepFormatted.formatted,
          },
          {
            label: 'Total Fees',
            value: totalUnclaimedDaiFormatted.formatted,
          },
          {
            label: 'Transaction Cost',
            value: `${sP.reportingFees.gasCosts[ALL]} ETH`,
          },
        ]
      : null;

  return {
    title: 'Claim Stake & Fees',
    descriptionMessage: [
      {
        preText: 'You have',
        boldText: `${totalUnclaimedRepFormatted.formatted} REP`,
        postText: 'available to be claimed from your reporting stake ',
      },
      {
        preText: ' and',
        boldText: `${totalUnclaimedDaiFormatted.formatted} DAI`,
        postText: 'of reporting fees to collect from the following markets:',
      },
    ],
    rows: markets,
    breakdown,
    closeAction: () => {
      if (sP.modal.cb) {
        sP.modal.cb();
      }
      dP.closeModal();
    },
    buttons: [
      {
        text: 'Claim All',
        disabled: markets.find(market => market.status === 'pending'),
        action: () => {
          const RedeemStakeOptions = {
            disputeWindows: feeWindowsPending
              ? []
              : sP.reportingFees.disputeWindows,
            nonforkedMarkets: claimableMarkets,
            onSent: () => {
              if (sP.modal.cb) {
                sP.modal.cb();
              }
            },
          };
          dP.redeemStake(RedeemStakeOptions, () => {
            if (sP.modal.cb) {
              sP.modal.cb();
            }
          });
          dP.closeModal();
        },
      },
      {
        text: 'Close',
        action: () => {
          if (sP.modal.cb) {
            sP.modal.cb();
          }
          dP.closeModal();
        },
      },
    ],
  };
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  )(Proceeds)
);
