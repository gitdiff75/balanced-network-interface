import React from 'react';

import { BalancedJs } from 'packages/BalancedJs';
import { useIconReact } from 'packages/icon-react';
import { Flex, Box } from 'rebass/styled-components';
import styled from 'styled-components';

import { Button, TextButton } from 'app/components/Button';
import Modal from 'app/components/Modal';
import { Typography } from 'app/theme';
import bnJs from 'bnJs';
import { useDerivedMintInfo } from 'store/mint/hooks';
import { usePoolPair, useSelectedPoolRate } from 'store/pool/hooks';
import { useTransactionAdder, TransactionStatus, useTransactionStatus } from 'store/transactions/hooks';
import { formatBigNumber } from 'utils';

import { depositMessage, supplyMessage } from './utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

enum SupplyModalStatus {
  'Supply' = 'Supply',
  'Cancel' = 'Cancel',
  'Remove' = 'Remove',
}

export enum Field {
  CURRENCY_A = 'CURRENCY_A',
  CURRENCY_B = 'CURRENCY_B',
}

export default function SupplyLiquidityModal({ isOpen, onClose }: ModalProps) {
  const { account } = useIconReact();

  const selectedPair = usePoolPair();

  const selectedPairRatio = useSelectedPoolRate();

  const addTransaction = useTransactionAdder();

  const [addingTxs, setAddingTxs] = React.useState({ [Field.CURRENCY_A]: '', [Field.CURRENCY_B]: '' });

  const handleAdd = (currencyType: Field) => () => {
    if (!account) return;

    const currencyKey =
      currencyType === Field.CURRENCY_A ? selectedPair.baseCurrencyKey : selectedPair.quoteCurrencyKey;

    bnJs
      .eject({ account: account })
      [currencyKey].dexDeposit(parsedAmounts[currencyType])
      .then(res => {
        addTransaction(
          { hash: res.result },
          {
            pending: depositMessage(currencyKey, selectedPair.pair).pendingMessage,
            summary: depositMessage(currencyKey, selectedPair.pair).successMessage,
          },
        );

        setAddingTxs(state => ({ ...state, [currencyType]: res.result }));
      })
      .catch(e => {
        console.error('error', e);
      });
  };

  const [removingTxs, setRemovingTxs] = React.useState({ [Field.CURRENCY_A]: '', [Field.CURRENCY_B]: '' });

  const handleRemove = (currencyType: Field) => () => {
    if (!account) return;

    const currencyKey =
      currencyType === Field.CURRENCY_A ? selectedPair.baseCurrencyKey : selectedPair.quoteCurrencyKey;

    bnJs.Dex.withdraw(bnJs[currencyKey].address, parsedAmounts[currencyType]).then(res => {
      addTransaction(
        { hash: res.result },
        {
          pending: `Withdrawing ${currencyKey}`,
          summary: `${parsedAmounts[currencyType]}${currencyKey} added to your wallet`,
        },
      );

      setRemovingTxs(state => ({ ...state, [currencyType]: res.result }));
    });
  };

  const [confirmTx, setConfirmTx] = React.useState('');

  const handleSupplyConfirm = () => {
    if (selectedPair.poolId === BalancedJs.utils.sICXICXpoolId) {
      bnJs
        .eject({ account: account })
        .Dex.transferICX(parsedAmounts[Field.CURRENCY_A])
        .then(res => {
          addTransaction(
            { hash: res.result },
            {
              pending: supplyMessage(
                formatBigNumber(parsedAmounts[Field.CURRENCY_A], 'currency'),
                selectedPair.baseCurrencyKey + ' / ' + selectedPair.quoteCurrencyKey,
              ).pendingMessage,
              summary: supplyMessage(
                formatBigNumber(parsedAmounts[Field.CURRENCY_A], 'currency'),
                selectedPair.baseCurrencyKey + ' / ' + selectedPair.quoteCurrencyKey,
              ).successMessage,
            },
          );

          setConfirmTx(res.result);
        })
        .catch(e => {
          console.error('error', e);
        });
    } else {
      bnJs
        .eject({ account: account })
        .Dex.add(
          parsedAmounts[Field.CURRENCY_A],
          parsedAmounts[Field.CURRENCY_B],
          selectedPairRatio,
          bnJs[selectedPair.baseCurrencyKey].address,
          bnJs[selectedPair.quoteCurrencyKey].address,
        )
        .then(res => {
          addTransaction(
            { hash: res.result },
            {
              pending: supplyMessage(
                formatBigNumber(parsedAmounts[Field.CURRENCY_A], 'currency'),
                selectedPair.baseCurrencyKey + ' / ' + selectedPair.quoteCurrencyKey,
              ).pendingMessage,
              summary: supplyMessage(
                formatBigNumber(parsedAmounts[Field.CURRENCY_A], 'currency'),
                selectedPair.baseCurrencyKey + ' / ' + selectedPair.quoteCurrencyKey,
              ).successMessage,
            },
          );

          setConfirmTx(res.result);
        })
        .catch(e => {
          console.error('error', e);
        });
    }
  };

  const confirmTxStatus = useTransactionStatus(confirmTx);
  React.useEffect(() => {
    if (confirmTx && confirmTxStatus === TransactionStatus.success) {
      onClose();
    }
  }, [confirmTx, confirmTxStatus, onClose]);

  // refresh Modal UI
  React.useEffect(() => {
    if (isOpen) {
      setAddingTxs({ [Field.CURRENCY_A]: '', [Field.CURRENCY_B]: '' });
      setRemovingTxs({ [Field.CURRENCY_A]: '', [Field.CURRENCY_B]: '' });
      setHasErrorMessage(false);
    }
  }, [isOpen]);

  const {
    // currencies,
    // pair,
    // pairState,
    // currencyBalances,
    parsedAmounts,
    // price,
    // liquidityMinted,
    // poolTokenPercentage,
    // error
  } = useDerivedMintInfo();

  const addingATxStatus: TransactionStatus = useTransactionStatus(addingTxs[Field.CURRENCY_A]);
  const addingBTxStatus: TransactionStatus = useTransactionStatus(addingTxs[Field.CURRENCY_B]);

  const removingATxStatus: TransactionStatus = useTransactionStatus(removingTxs[Field.CURRENCY_A]);
  const removingBTxStatus: TransactionStatus = useTransactionStatus(removingTxs[Field.CURRENCY_B]);

  const [modalStatus] = React.useState(SupplyModalStatus.Supply);

  React.useEffect(() => {
    if (addingATxStatus === TransactionStatus.success) {
      setRemovingTxs(state => ({ ...state, [Field.CURRENCY_A]: '' }));
    }
  }, [addingATxStatus]);

  React.useEffect(() => {
    if (removingATxStatus === TransactionStatus.success) {
      setAddingTxs(state => ({ ...state, [Field.CURRENCY_A]: '' }));
    }
  }, [removingATxStatus]);

  React.useEffect(() => {
    if (addingBTxStatus === TransactionStatus.success) {
      setRemovingTxs(state => ({ ...state, [Field.CURRENCY_B]: '' }));
    }
  }, [addingBTxStatus]);

  React.useEffect(() => {
    if (removingBTxStatus === TransactionStatus.success) {
      setAddingTxs(state => ({ ...state, [Field.CURRENCY_B]: '' }));
    }
  }, [removingBTxStatus]);

  const [hasErrorMessage, setHasErrorMessage] = React.useState(false);
  const handleCancelSupply = () => {
    if (addingATxStatus === TransactionStatus.success || addingBTxStatus === TransactionStatus.success) {
      setHasErrorMessage(true);
    } else {
      onClose();
    }
  };

  const isEnabled = addingATxStatus === TransactionStatus.success && addingBTxStatus === TransactionStatus.success;

  const getModalContent = () => {
    if (modalStatus === SupplyModalStatus.Supply) {
      return (
        <Flex flexDirection="column" alignItems="stretch" m={5} width="100%">
          <Typography textAlign="center" mb="5px" as="h3" fontWeight="normal">
            Supply liquidity?
          </Typography>

          <Typography
            variant="p"
            textAlign="center"
            mb={4}
            style={selectedPair.baseCurrencyKey.toLowerCase() === 'icx' ? { display: 'none' } : {}}
          >
            Send each asset to the pool, <br />
            then click Supply
          </Typography>

          <Flex alignItems="center" mb={4}>
            <Box width={selectedPair.baseCurrencyKey.toLowerCase() === 'icx' ? 1 : 1 / 2}>
              <Typography
                variant="p"
                fontWeight="bold"
                textAlign={selectedPair.baseCurrencyKey.toLowerCase() === 'icx' ? 'center' : 'right'}
              >
                {formatBigNumber(parsedAmounts[Field.CURRENCY_A], 'ratio')} {selectedPair.baseCurrencyKey}
              </Typography>
            </Box>
            <Box width={1 / 2} style={selectedPair.baseCurrencyKey.toLowerCase() === 'icx' ? { display: 'none' } : {}}>
              {((addingTxs[Field.CURRENCY_A] === '' && removingTxs[Field.CURRENCY_A] === '') ||
                (addingATxStatus === TransactionStatus.pending && removingTxs[Field.CURRENCY_A] === '') ||
                removingATxStatus === TransactionStatus.success) && (
                <SupplyButton disabled={!!addingTxs[Field.CURRENCY_A]} ml={3} onClick={handleAdd(Field.CURRENCY_A)}>
                  {addingTxs[Field.CURRENCY_A] ? 'Sending' : 'Send'}
                </SupplyButton>
              )}
              {addingATxStatus === TransactionStatus.success && (
                <RemoveButton
                  disabled={!!removingTxs[Field.CURRENCY_A]}
                  ml={3}
                  onClick={handleRemove(Field.CURRENCY_A)}
                >
                  {removingTxs[Field.CURRENCY_A] ? 'Removing' : 'Remove'}
                </RemoveButton>
              )}
            </Box>
          </Flex>

          <Flex
            alignItems="center"
            mb={4}
            style={selectedPair.baseCurrencyKey.toLowerCase() === 'icx' ? { display: 'none' } : {}}
          >
            <Box width={1 / 2}>
              <Typography variant="p" fontWeight="bold" textAlign="right">
                {formatBigNumber(parsedAmounts[Field.CURRENCY_B], 'ratio')} {selectedPair.quoteCurrencyKey}
              </Typography>
            </Box>
            <Box width={1 / 2}>
              {((addingTxs[Field.CURRENCY_B] === '' && removingTxs[Field.CURRENCY_B] === '') ||
                (addingBTxStatus === TransactionStatus.pending && removingTxs[Field.CURRENCY_B] === '') ||
                removingBTxStatus === TransactionStatus.success) && (
                <SupplyButton disabled={!!addingTxs[Field.CURRENCY_B]} ml={3} onClick={handleAdd(Field.CURRENCY_B)}>
                  {addingTxs[Field.CURRENCY_B] ? 'Sending' : 'Send'}
                </SupplyButton>
              )}
              {addingBTxStatus === TransactionStatus.success && (
                <RemoveButton
                  disabled={!!removingTxs[Field.CURRENCY_B]}
                  ml={3}
                  onClick={handleRemove(Field.CURRENCY_B)}
                >
                  {removingTxs[Field.CURRENCY_B] ? 'Removing' : 'Remove'}
                </RemoveButton>
              )}
            </Box>
          </Flex>

          <Typography textAlign="center" mb={2}>
            {selectedPair.baseCurrencyKey.toLowerCase() === 'icx' ? (
              <>Your ICX will be locked in the pool for the first 24 hours.</>
            ) : (
              <>
                Your ICX will be staked, and your
                <br /> assets will be locked for 24 hours.
              </>
            )}
          </Typography>

          {hasErrorMessage && (
            <Typography textAlign="center" color="alert">
              Remove your assets to cancel this transaction.
            </Typography>
          )}

          <Flex justifyContent="center" mt={4} pt={4} className="border-top">
            <TextButton onClick={handleCancelSupply}>Cancel</TextButton>
            <Button disabled={!isEnabled} onClick={handleSupplyConfirm}>
              {confirmTx ? 'Supplying' : 'Supply'}
            </Button>
          </Flex>
        </Flex>
      );
    }

    // if (modalStatus === SupplyModalStatus.Cancel) {
    //   return (
    //     <Flex flexDirection="column" alignItems="stretch" m={5} width="100%">
    //       <Typography textAlign="center" mb="5px" as="h3" fontWeight="normal">
    //         Cancel supply?
    //       </Typography>

    //       <Typography
    //         variant="p"
    //         textAlign="center"
    //         mb={4}
    //         style={selectedPair.baseCurrencyKey.toLowerCase() === 'icx' ? { display: 'none' } : {}}
    //       >
    //         Remove your assets from the <br />
    //         pool to cancel this transaction
    //       </Typography>

    //       {inputATx && inputATxStatus === TransactionStatus.success && (
    //         <Flex alignItems="center" justifyContent="center" mb={4}>
    //           <Typography variant="p" fontWeight="bold">
    //             {formatBigNumber(parsedAmounts[Field.CURRENCY_A], 'ratio')} {selectedPair.baseCurrencyKey}
    //           </Typography>
    //         </Flex>
    //       )}

    //       {inputBTx && inputBTxStatus === TransactionStatus.success && (
    //         <Flex alignItems="center" justifyContent="center" mb={4}>
    //           <Typography variant="p" fontWeight="bold" textAlign="right">
    //             {formatBigNumber(parsedAmounts[Field.CURRENCY_B], 'ratio')} {selectedPair.quoteCurrencyKey}
    //           </Typography>
    //         </Flex>
    //       )}

    //       <Flex justifyContent="center" mt={4} pt={4} className="border-top">
    //         <TextButton onClick={handleGoBack}>Go back</TextButton>
    //         <RemoveButton onClick={handleRemoveDeposit}>Remove and cancel</RemoveButton>
    //       </Flex>
    //     </Flex>
    //   );
    // }
  };

  return (
    <Modal isOpen={isOpen} onDismiss={() => undefined}>
      {getModalContent()}
    </Modal>
  );
}

const SupplyButton = styled(Button)`
  padding: 5px 10px;
  font-size: 12px;
`;

const RemoveButton = styled(SupplyButton)`
  background-color: #fb6a6a;

  &:hover {
    background-color: #fb6a6a;
  }

  &:disabled {
    background: #27264a;
  }
`;