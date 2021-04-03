import React from 'react';

import { useIconReact } from 'packages/icon-react';
import ClickAwayListener from 'react-click-away-listener';
import { useMedia } from 'react-use';
import { Flex, Box } from 'rebass/styled-components';
import styled from 'styled-components';

import { Button, TextButton } from 'app/components/Button';
import CurrencyInputPanel from 'app/components/CurrencyInputPanel';
import Divider from 'app/components/Divider';
import { UnderlineTextWithArrow } from 'app/components/DropdownText';
import Modal from 'app/components/Modal';
import { DropdownPopper } from 'app/components/Popover';
import { Typography } from 'app/theme';
import bnJs from 'bnJs';
import { CURRENCYLIST } from 'constants/currency';
import { useRatioValue } from 'store/ratio/hooks';
import { useWalletBalanceValue } from 'store/wallet/hooks';

const Grid = styled.div`
  display: grid;
  grid-template-rows: auto;
  grid-gap: 15px;
`;

const ReturnICDSection = () => {
  const wallet = useWalletBalanceValue();
  const ratio = useRatioValue();
  const { account } = useIconReact();
  const [retireAmount, setRetireAmount] = React.useState('0');
  const [receiveAmount, setReceiveAmount] = React.useState('0');
  const [swapFee, setSwapFee] = React.useState('0');
  const [open, setOpen] = React.useState(false);

  const handleTypeInput = React.useCallback(
    (val: string) => {
      setRetireAmount(val);
      bnJs
        .eject({ account: account })
        .Dex.getFees()
        .then(res => {
          const bal_holder_fee = parseInt(res[`pool_baln_fee`], 16);
          const lp_fee = parseInt(res[`pool_lp_fee`], 16);
          const fee = (parseFloat(val) * (bal_holder_fee + lp_fee)) / 10000;
          setSwapFee(fee.toFixed(2).toString());
          val = (parseFloat(val) - fee).toString();
          setReceiveAmount((parseFloat(val) * ratio.sICXbnUSDratio?.toNumber()).toFixed(2).toString());
        })
        .catch(e => {
          console.error('error', e);
        });
    },
    [account, ratio],
  );

  // handle retire balance dropdown
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  const arrowRef = React.useRef(null);

  const handleToggleDropdown = (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(anchor ? null : arrowRef.current);
  };

  const closeDropdown = () => {
    setAnchor(null);
  };

  //
  const below800 = useMedia('(max-width: 800px)');

  if (below800) {
    return null;
  }

  const toggleOpen = () => {
    setOpen(!open);
  };

  const handleRetire = () => {
    closeDropdown();
    setOpen(true);
  };

  const handleRetireDismiss = () => {
    setOpen(false);
  };

  return (
    <>
      <ClickAwayListener onClickAway={closeDropdown}>
        <div>
          <UnderlineTextWithArrow onClick={handleToggleDropdown} text="Retire Balanced assets" arrowRef={arrowRef} />

          <DropdownPopper show={Boolean(anchor)} anchorEl={anchor} placement="bottom-end">
            <Box padding={5} bg="bg4">
              <Grid>
                <Typography variant="h2">Retire bnUSD</Typography>

                <Typography>Sell your bnUSD for ${ratio.sICXbnUSDratio?.toFixed(2)} of sICX (staked ICX).</Typography>

                <CurrencyInputPanel
                  currency={CURRENCYLIST['bnusd']}
                  value={retireAmount}
                  onUserInput={handleTypeInput}
                  showMaxButton={false}
                  id="return-icd-input"
                  bg="bg5"
                />

                <Flex flexDirection="column" alignItems="flex-end">
                  <Typography mb={2}>Minimum: 1000 bnUSD</Typography>
                  <Typography>Wallet: {wallet.bnUSDbalance?.toFixed(2)} bnUSD</Typography>
                </Flex>

                <Divider />

                <Flex alignItems="flex-start" justifyContent="space-between">
                  <Typography variant="p">Total</Typography>
                  <Flex flexDirection="column" alignItems="flex-end">
                    <Typography variant="p">{receiveAmount} sICX</Typography>
                    <Typography variant="p" color="text1" fontSize={14}>
                      ~ {(parseFloat(receiveAmount) * ratio.sICXICXratio?.toNumber()).toFixed(2)} ICX
                    </Typography>
                  </Flex>
                </Flex>
              </Grid>

              <Flex justifyContent="center" mt={5}>
                <Button onClick={handleRetire}>Retire bnUSD</Button>
              </Flex>
            </Box>
          </DropdownPopper>
        </div>
      </ClickAwayListener>

      <Modal isOpen={open} onDismiss={toggleOpen}>
        <Flex flexDirection="column" alignItems="stretch" m={5} width="100%">
          <Typography textAlign="center" mb="5px" as="h3" fontWeight="normal">
            Retire Balanced Dollars?
          </Typography>

          <Flex my={5}>
            <Box width={1 / 2} className="border-right">
              <Typography textAlign="center">Retire</Typography>
              <Typography variant="p" textAlign="center">
                {retireAmount} bnUSD
              </Typography>
            </Box>

            <Box width={1 / 2}>
              <Typography textAlign="center">Receive</Typography>
              <Typography variant="p" textAlign="center">
                {receiveAmount} sICX
              </Typography>
              <Typography textAlign="center">
                ~ {(parseFloat(receiveAmount) * ratio.sICXICXratio?.toNumber()).toFixed(2)} ICX
              </Typography>
            </Box>
          </Flex>

          <Typography textAlign="center">Includes a fee of {swapFee} bnUSD.</Typography>

          <Flex justifyContent="center" mt={4} pt={4} className="border-top">
            <TextButton onClick={handleRetireDismiss}>Cancel</TextButton>
            <Button>Confirm</Button>
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

export default ReturnICDSection;
